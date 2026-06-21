<h1>
  <img src="web/public/brawl_analytics_logo.svg" width="75" height="75" align="center" alt="Brawl Analytics Logo">
  Brawl Analytics
</h1>

Trophy-history and match-detail web app for Brawl Stars players, plus a
cross-player analytics warehouse. The system spans a synchronous read API, an
asynchronous scheduled write pipeline on AWS, and a daily analytics ETL — all
backed by Supabase.

The frontend (`web/`) is pending a refactor and is intentionally left out of
this README.

## Architecture

Three independent data paths share one OLTP database.

```
  READ PATH (synchronous, user-facing)
  ────────────────────────────────────
   web ──▶ backend ──▶ brawl-data-service (HTTP) ──▶ Brawl Stars API
             │
             └──▶ Supabase OLTP (private schema)
           backend merges fresh API data with stored battles, newest-first


  WRITE PATH (asynchronous, scheduled on AWS)
  ───────────────────────────────────────────
   EventBridge ──▶ coordinator-service ──▶ SQS ──▶ brawl-data-service ──▶ Brawl Stars API
                   (Lambda)              (tag      (SQS Lambda,                │
                   reads tracked tags,   batches    VPC → static NAT IP)       ▼
                   batches ≤25/message)  ≤25)       upserts ──▶ Supabase OLTP (private schema)


  ANALYTICS PATH (asynchronous, daily on AWS)
  ───────────────────────────────────────────
   EventBridge ──▶ player-analytics ETL ──▶ Supabase Analytics (public star schema)
                   (Python Lambda)           reads OLTP since watermark, loads facts/dims
```

### Components

| Component | Role | Runtime |
|---|---|---|
| `web` | React + Vite frontend (pending refactor) | Browser |
| `backend` | Read API. Owns OLTP reads, merges live + stored data for the frontend. | Express 5 (Node) |
| `brawl-data-service` | **Dual role.** (1) Stateless HTTP layer that normalizes the Brawl Stars API. (2) SQS-triggered Lambda that fetches and upserts battles (the write path). | TypeScript (`tsx`) |
| `coordinator-service` | Scheduler. Reads tracked player tags and fans them into SQS in batches of ≤25. | Node Lambda |
| `player-analytics` | Analytics warehouse + ETL that copies OLTP into a star schema. | Python 3.12 Lambda |
| `infrastructure` | AWS CDK app defining all cloud resources. | TypeScript (CDK) |
| `supabase` | OLTP schema migrations (`private` schema). | Supabase CLI |

### Two Supabase projects

- **OLTP** — `private` schema, accessed only by the `service_role`. Holds the
  live battle data the app reads and writes. The frontend cannot reach it
  directly.
- **Analytics** — separate Supabase project, `public` star schema. Read-only
  product of the ETL. Used for cross-player aggregate analysis.

### Why the write path is split out

The Brawl Stars API allowlists by source IP and rate-limits per key. Routing
all outbound battle fetches through a single static NAT egress IP (see
`infrastructure`) lets one allowlisted key serve the whole fleet, and moving
the fetch-and-write work off the request path lets it scale and retry
independently of the read API. The `coordinator → SQS → consumer` shape caps
concurrency against the Brawl rate limit and isolates per-tag failures.

## Repository layout

```
brawl-analytics/
├── web/                  ← React + Vite frontend (pending refactor)
├── backend/              ← read API (Express) over the OLTP DB
├── brawl-data-service/   ← Brawl API normalizer (HTTP) + SQS write Lambda
│   ├── controllers/        HTTP read handlers
│   ├── services/           brawlClient, batchProcessor, battleWriter, battleRows
│   ├── handlers/           sqs.ts (write-path Lambda entry), invoke.ts
│   ├── utils/              battleId, modeMap, formatData, time
│   └── types/
├── coordinator-service/  ← scheduler Lambda: tags → SQS batches
├── player-analytics/     ← analytics warehouse
│   ├── etl/                Python ETL (extract → transform → load)
│   ├── migrations/         star-schema DDL
│   └── supabase/           analytics-project Supabase config
├── infrastructure/       ← AWS CDK (network / lambda / etl stacks)
├── supabase/migrations/  ← OLTP schema + views
├── docker-compose.yml    ← local stack (web + backend + data-service)
└── local/                ← sample API responses
```

## Read path

`backend` exposes the player-facing API under `/api`. CORS is locked to the
Vite dev server (`http://localhost:5173`).

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/players/:tag/`                            | Profile + battle log proxied via the data service |
| GET  | `/api/players/:tag/battles`                     | Unified (live + DB) trophy history, newest first |
| GET  | `/api/players/:tag/brawlers/:brawlerId/battles` | Unified per-brawler battle log |
| GET  | `/api/players/:tag/metrics`                     | Aggregated W/D/L: overall, per mode, per brawler |
| GET  | `/api/players/:tag/recent-battles?limit=&offset=` | Paginated recent-battle detail |
| POST | `/api/users/:userId/players`                    | Register a player tag to a Supabase Auth user |

The unified read endpoints run the data service and the DB concurrently
(`Promise.allSettled`), normalize both into one canonical shape, and merge by
`battleId` with the DB winning on conflict (stored data is authoritative).
Reads never write — persistence is owned entirely by the write path. The Brawl
API only returns the ~25 newest battles, so for `recent-battles` with
`offset > 0` the backend skips the live call and serves straight from the DB.

### OLTP schema (`private`)

```
user_players            tracked player tags per Supabase Auth user — PK (user_id, player_tag)
battle_info             1 row per unique battle (battle_id, mode_id, map, battle_level)
battle_log              1 row per battle per player (result/rank, trophy_change, trophies)
brawler_trophies_store  1 row per battle per participant (brawler, brawler_trophies)
```

`battle_id = md5(anchor_player_tag | battle_time)`, where the anchor is the
lexicographically smallest tag among participants — so the same physical battle
observed from different players' logs produces one stable ID, and upserts
dedupe naturally. Two views (`brawler_battle_log`, `detailed_battle_log`) layer
the joins each endpoint needs. Migrations live in `supabase/migrations/` and
apply with `supabase db push`.

## Write path

1. **`coordinator-service`** (Lambda, EventBridge schedule) reads every tracked
   tag from `user_players` and publishes them to SQS in batches of ≤25
   (`{ "playerTags": [...] }`).
2. **`brawl-data-service` SQS Lambda** (`handlers/sqs.ts`) consumes one batch
   per message: fetches each tag's battle log from the Brawl Stars API
   (bounded fan-out), then does one batched upsert per OLTP table
   (`ON CONFLICT DO NOTHING` — battles are immutable once written).

The consumer Lambda runs in the VPC's private subnets so its Brawl API calls
egress the static NAT IP. SQS `maxConcurrency` caps parallel invocations
against the Brawl per-key rate limit. Malformed messages are logged and
skipped; the coordinator re-enqueues every tick, so drops self-heal.

What `brawl-data-service` normalizes from the raw API: ISO timestamps, a stable
internal mode ID space (`utils/modeMap.ts`), deterministic battle IDs, a
unified `result`/`rank` field across team and showdown modes, reconstructed
historical trophy totals, and ranked-match filtering. See
`brawl-data-service/` for the per-battle output shape.

## Analytics path

`player-analytics/etl` is a Python Lambda on a daily EventBridge schedule. Each
run extracts OLTP rows newer than a stored watermark, resolves star-schema dim
keys, and loads `brawler_fact` in the analytics Supabase project.

- **Star schema** (`player-analytics/migrations/`): `brawler_fact` at grain
  `(player_tag, battle_id)`, with `date_dim`, `brawler_dim`, `battle_dim`,
  `trophy_band_dim`, and `brawler_trophy_band_dim`.
- **Idempotent**: fact insert is `ON CONFLICT DO NOTHING`; the watermark
  advance shares the fact insert's transaction, so a failed run replays cleanly.
- **Connectivity**: connects over the Supabase **session-mode pooler** (port
  5432, IPv4-reachable). Not VPC-bound — it only talks to public Supabase
  endpoints and needs no NAT IP.

Full operational detail (pooler URL format, TLS modes, new-brawler/new-mode
handling) is in `player-analytics/etl/README.md`.

## Infrastructure (AWS CDK)

TypeScript CDK app in `infrastructure/`. Region and VPC settings live in
`config/environments.ts`; stacks are wired in `bin/app.ts`. Secrets load at
synth time from the shared `infrastructure/.env`.

| Stack | Provisions | VPC |
|---|---|---|
| `NetworkStack` | VPC + [fck-nat](https://github.com/AndrewGuenther/cdk-fck-nat) NAT instance (low-cost NAT replacement) holding a static Elastic IP. The EIP re-associates on instance replacement so the egress IP never changes — this is the address the Brawl Stars API allowlists. | — |
| `LambdaStack` | The SQS-triggered battle-writer Lambda (`brawl-data-service/handlers/sqs.ts`), bound to the private subnets so it egresses the NAT IP. Imports the existing SQS queue by ARN. | Yes |
| `EtlStack` | The Python analytics ETL Lambda (`player-analytics/etl`). Runs outside the VPC — public Supabase pooler only. | No |
| `ComputeStack` | Scaffold for future EC2; defines no resources yet. | — |

The SQS queue and the EventBridge schedules are owned outside CDK; the stacks
reference them by ARN/name. See `infrastructure/README.md` for deploy commands.

## Local development

`docker-compose.yml` runs the read path (`web`, `backend`,
`brawl-data-service` HTTP) with file-watch rebuilds. All services read the
shared `infrastructure/.env` (copy from `infrastructure/.env.example`).

```sh
docker compose up --watch
```

| Service | Port |
|---|---|
| web (Vite)            | 5173 |
| backend (Express)     | 4000 |
| brawl-data-service    | 4001 |

Or run a single service directly — each has its own `npm run dev`. The write
path and ETL are Lambda-only and are exercised locally via their own run shims
(`coordinator-service/local.js`, `python -m etl.handler`).

### Key environment variables

Defined once in `infrastructure/.env` (see `.env.example` for the full list):

| Var | Used by |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | all services — OLTP access |
| `BACKEND_PORT`, `DATA_SERVICE_URL`          | backend |
| `DATA_SERVICE_PORT`, `BRAWL_DEVELOPER_API_KEY`, `BRAWL_API_BASE_URL` | brawl-data-service (HTTP) |
| `LAMBDA_BS_DEV_KEY`                          | write-path Lambda (key registered to the NAT IP) |
| `SQS_QUEUE_URL` / `SQS_QUEUE_ARN`           | coordinator-service / CDK |
| `SOURCE_DB_URL`, `TARGET_DB_URL`            | analytics ETL (pooler URLs) |
