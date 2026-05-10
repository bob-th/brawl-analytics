<h1>
  <img src="web/public/brawl_analytics_logo.svg" width="75" height="75" align="center" alt="Brawl Analytics Logo">
  Brawl Analytics
</h1>

Brawler Trophy-history and match-detail web app for Brawl Stars players. The frontend
is intentionally omitted from this README — it's pending a full refactor. What
follows describes the two backend services that the frontend (current and
future) consumes.

## Architecture

```
                 ┌──────────────────────┐
                 │   Brawl Stars API    │
                 └──────────┬───────────┘
                            │  raw JSON
                            ▼
                 ┌──────────────────────┐
                 │   brawl-data-service │   stateless transport +
                 │   (Express + TS)     │   normalization layer
                 └──────────┬───────────┘
                            │  formatted JSON
                            ▼
                 ┌──────────────────────┐         ┌──────────────────┐
                 │      backend         │◄───────►│    Supabase      │
                 │  (Express + cron)    │         │  (private schema)│
                 └──────────┬───────────┘         └──────────────────┘
                            │  unified JSON
                            ▼
                       (frontend)
```

Two services, each with one job:

- **`brawl-data-service`** is the only thing that talks to the Brawl Stars
  API. It takes the raw API responses and returns a normalized shape — stable
  field names, ISO timestamps, deterministic battle IDs, internal mode IDs.
  Stateless. No database.
- **`backend`** is the application server. It owns the database, exposes the
  player-facing endpoints, runs the periodic sync, and is the only service
  that holds a Supabase service-role key. It calls `brawl-data-service` for
  live data and merges that with the historical battles it has stored.

### Why split them

The Brawl Stars API has quirks (date formats, ranked-match edge cases, mode
naming inconsistencies, trophy reconstruction). Concentrating all of that in
one service means the backend never has to know about it — the backend
consumes a clean, stable contract. It also lets the data service be deployed
separately if rate-limiting or caching strategies need to evolve independently.

## Repository layout

```
brawl-analytics/
├── backend/              ← API server + Supabase client + cron sync
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── database.js       ← Supabase client singleton
│   └── index.js
├── brawl-data-service/   ← Brawl Stars API wrapper / normalizer
│   ├── controllers/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   ├── tests/
│   └── index.js
├── supabase/migrations/  ← schema + view definitions, applied via `supabase db push`
├── web/                  ← (frontend, pending refactor — not documented here)
└── local/                ← sample API responses for reference
```

---

## Backend

Express 5 server. Runs on `process.env.PORT`. Mounts two routers under `/api`:

- `/api/players/...` — battle data, metrics, player info
- `/api/users/...`   — links Supabase Auth users to player tags they track

CORS is currently locked to `http://localhost:5173` for the frontend
dev server.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/players/:playerTag/`                                 | Player profile + raw battle log proxied through the data service |
| GET  | `/api/players/:playerTag/battles`                          | Unified (DS + DB) trophy history, all battles, newest first |
| GET  | `/api/players/:playerTag/brawlers/:brawlerId/battles`      | Unified per-brawler battle log |
| GET  | `/api/players/:playerTag/metrics`                          | Aggregated W/D/L counts: overall, per mode, per brawler |
| GET  | `/api/players/:playerTag/recent-battles?limit=&offset=`    | Paginated detail view of recent battles (brawler used, brawler trophies, total trophies, mode, map, result) |
| POST | `/api/users/:userId/players`                               | Register a player tag to a Supabase Auth user (verified via the data service before insert) |

Player tags accept either `#` or URL-encoded `%23` prefixes. All tags are
normalized to `#XXXX` form on entry via `utils/brawl.js`.

### Database schema

All tables live in a `private` Postgres schema. Only Supabase's
`service_role` is granted access — `anon` and `authenticated` roles get
permission denied even if they hit PostgREST directly. The backend is the
only thing that holds the service-role key.

```
user_players              joins Supabase Auth users to tracked player tags
                          PK (user_id, player_tag)

battle_info               1 row per unique battle
                          (battle_id, mode_id, map)
                          battle_id = md5(anchor_player_tag | battle_time)
                          where anchor = lex-smallest tag among participants

battle_log                1 row per battle per player observed
                          PK (player_tag, battle_time)
                          (result enum or rank, trophy_change, trophies)

brawler_trophies_store    1 row per battle per participant
                          PK (player_tag, battle_time)
                          (brawler, brawler_trophies)
```

Two views layer on top — each carries only the joins its consumers need so
no endpoint pays for joins it doesn't use:

- `brawler_battle_log`  = `battle_log` ⋈ `brawler_trophies_store`.
  Used by the per-brawler battle log endpoint.
- `detailed_battle_log` = `battle_log` ⋈ `brawler_trophies_store` ⋈
  `battle_info`. Used by the metrics endpoint and the recent-battles endpoint
  (anything that needs `mode_id` / `map`).

Migrations live in `supabase/migrations/` and are applied with
`supabase db push` (Supabase CLI). Each file is timestamped — new migrations
go in the same directory with a fresh timestamp prefix.

### Service layout

```
controllers/      thin HTTP handlers — validate input, call services,
                  shape errors to status codes
services/
  battleService     unified DS+DB endpoints (battles, brawler battles,
                    recent battles). Houses the canonical-shape helpers
                    and `unifyResult` (collapses result/rank into one field).
  battleRepository  all Supabase queries live here — services don't talk to
                    the DB directly.
  battleWriter      upserts DS battles into battle_info / battle_log /
                    brawler_trophies_store. ON CONFLICT DO NOTHING — battles
                    are immutable once written.
  battleSync        cron-driven full refresh (see below).
  metricsService    pure aggregation: takes the rows from
                    battleRepository.fetchPlayerBattlesForMetrics and bins
                    them into wins/draws/losses by mode and by brawler.
  userService       player-tag registration (verifies via DS before insert).
  dataSource        thin transport wrapper around the data service HTTP API.
utils/              tag normalization, deterministic merge, fetch helper.
```

### Unified DS + DB pattern

The two unified endpoints (`/battles`, `/brawlers/:id/battles`,
`/recent-battles`) share the same skeleton:

1. `Promise.allSettled` against the data service and the DB.
2. If both fail, throw — surfaces as `502`.
3. Otherwise normalize the DS payload into the same canonical shape as the DB
   rows.
4. Merge by `battleId` (DB wins on conflict — already-stored data is
   authoritative).
5. Format the merged list for the response.
6. After responding, fire-and-forget `persistNewBattles` for any DS battles
   that weren't already in the DB. Only runs when **both** sources succeeded
   — avoids re-upserting the world during a sustained DB outage.

`recent-battles` adds one wrinkle: pagination. The Brawl Stars API only ever
returns the ~25 newest battles, so DS unification is only useful for page 1.
For `offset > 0` the service skips the DS round-trip entirely and serves
straight from the DB.

### Background sync

`backend/index.js` schedules `syncAllPlayers` via node-cron every 30 minutes:

1. Pull every distinct `player_tag` from `user_players`.
2. For each, fetch the data service's battle log and upsert into the DB.
3. Errors on one tag are logged and don't halt the rest.

This is what backfills the historical data beyond the Brawl Stars API's
~25-battle window. The opportunistic `persistNewBattles` calls from the
unified endpoints supplement it for active users between cron ticks.

### Environment variables

| Var | Purpose |
|---|---|
| `PORT`                       | HTTP listen port |
| `SUPABASE_URL`               | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service-role key — required for `private` schema access. Never expose client-side. |
| `DATA_SERVICE_URL`           | Base URL of `brawl-data-service` (e.g. `http://localhost:4000`) |

### Running

```
cd backend
npm install
npm run dev      # nodemon
npm start        # node index.js
```

---

## brawl-data-service

The Brawl Stars API translation layer. TypeScript on Node, run via `tsx`
(no compile step). Stateless — no database, no auth.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/player/:playerTag/`         | Player profile (trophy summaries, brawler counts) |
| GET | `/player/:playerTag/battles/` | Normalized battle log (newest first) |

### What it normalizes

The Brawl Stars API has a few inconveniences this service hides from the
backend:

- **Date format.** Brawl returns `"20260420T222509.000Z"`; everything
  downstream wants ISO 8601. Converted in `utils/mergeBattles.js` (mirrored
  in the backend) and at ingest.
- **Mode naming.** Brawl returns mode strings (`"gemGrab"`, `"soloShowdown"`).
  `utils/modeMap.ts` maps these to a stable internal ID space (1–8) that the
  backend stores and aggregates against. New modes have to be added here.
- **Battle IDs.** Brawl gives no stable battle identifier. We compute one as
  `md5(anchor_player_tag | battle_time)` where `anchor_player_tag` is the
  lexicographically smallest tag among participants. The sort guarantees
  determinism — two independent ingestions of the same physical battle (e.g.
  one player's view + a teammate's view) produce the same `battleId`, so
  upserts naturally dedupe.
- **Showdown vs team modes.** Showdown rows carry a `rank` (1–10) and no
  `result`; team modes carry a `result` (`victory`/`defeat`/`draw`) and no
  `rank`. The backend's `unifyResult` collapses these into one field for
  responses.
- **Total trophy reconstruction.** The Brawl API gives current trophies and
  per-battle trophy changes, but no historical totals. The data service
  walks battles newest → oldest and subtracts each `trophyChange` from the
  current total to attach a `totalTrophies` to each battle.
- **Ranked-match filter.** Ranked matches don't carry `trophyChange` and are
  filtered out at normalization time so they don't pollute trophy graphs.

### Output shape (per battle)

See `local/ds_api_response_example.json` for a full sample. Fields the
backend relies on:

```
battleId, battleTime, modeId, map, result, rank,
trophyChange, totalTrophies, isShowdown,
players: [{ playerTag, brawlerId, brawlerName, trophies }, ...]
```

`players[]` includes every participant in the battle — the backend uses
this to fan out into `brawler_trophies_store` rows during `persistNewBattles`.

### Environment variables

| Var | Purpose |
|---|---|
| `PORT`                       | HTTP listen port |
| `BRAWL_DEVELOPER_API_KEY`    | Brawl Stars developer API token, sent as `Authorization: Bearer <key>` on every API call |

### Running

```
cd brawl-data-service
npm install
npm run dev          # tsx watch
npm start            # tsx index.js
npm run typecheck    # tsc --noEmit
npm test             # tsx --test tests/*.test.ts
```
