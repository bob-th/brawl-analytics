# brawler analytics ETL

Daily-ish job that copies new rows from the OLTP Supabase project
(`private` schema) into the analytics star schema (`public` schema in a
separate Supabase project), resolving dim keys along the way.

## Layout

```
etl/
  handler.py     Lambda entry + local CLI (`python -m etl.handler`)
  pipeline.py    run_etl() orchestrator
  extract.py     OLTP read query
  load.py        analytics writes (caches, dim upserts, fact insert, watermark)
  transform.py   pure functions (mode reverse-map, band lookup, row transform)
  db.py          pg8000 connect helpers
  config.py      env-var loader
  tests/         pytest unit tests for transform.py
```

## Env vars

| name              | required | default               | notes                            |
|-------------------|----------|-----------------------|----------------------------------|
| `SOURCE_DB_URL`   | yes      | —                     | OLTP Postgres URL (pooler ok)    |
| `TARGET_DB_URL`   | yes      | —                     | analytics Postgres URL           |
| `BATCH_SIZE`      | no       | `1000`                | rows per extract → load cycle    |
| `MAX_BATCHES`     | no       | `0` (unlimited)       | safety cap per invocation        |
| `ETL_KEY`         | no       | `brawler_fact_load`   | watermark row to use             |

Both URLs use the `postgresql://user:pass@host:port/dbname` form. Supabase
exposes a pooler URL in **Dashboard → Project Settings → Database →
Connection String** (use the "Transaction" pooler, port 6543).

`config.py` reads from `os.environ` at runtime. Two ways to populate it:

- **Local dev** — copy `etl/.env.example` to `etl/.env` and fill in. The
  config module auto-loads `etl/.env` via `python-dotenv` if installed.
  `.env` is gitignored.
- **Lambda** — set them in the function's environment variables config in
  the AWS console / IaC. No `.env` file ships in the zip.

The `.env` file is just a convenience for local runs. The Python code
doesn't care where the env vars come from.

## Local run

Two separate environment concepts here, don't conflate them:

1. **Python `venv`** — isolates installed packages (`pg8000`, `python-dotenv`).
   Does NOT carry your DB credentials.
2. **`.env` file** — holds your DB URLs and is read at runtime by `config.py`.
   Does NOT manage Python packages.

```powershell
cd player-analytics\etl

# 1. Python venv for package isolation (one-time setup)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Credentials via .env file (one-time per machine)
copy .env.example .env
# now edit .env, paste the real SOURCE_DB_URL and TARGET_DB_URL

# 3. Run
cd ..
python -m etl.handler
```

You should see one line per batch (`batch N: M rows, watermark=…`) and a
`done: { … }` summary at the end. Re-running immediately should print
`done: { batches: 0, rows: 0, … }` — the watermark already covers everything.

If you'd rather skip the `.env` file, just export the vars before running:

```powershell
$env:SOURCE_DB_URL = "..."
$env:TARGET_DB_URL = "..."
python -m etl.handler
```

## Tests

```powershell
cd player-analytics\etl
pip install pytest
pytest
```

Tests cover the pure transform layer only — no DB. End-to-end verification
is the SQL checklist in the planning doc.

## Lambda deploy

```bash
# from player-analytics/etl
pip install -r requirements.txt -t .
zip -r ../etl.zip . -x '*.pyc' '__pycache__/*' '.venv/*' 'tests/*' '.env' '.env.example'
```

Upload `etl.zip` to a Python 3.12 Lambda. Set:

- **handler:** `etl.handler.lambda_handler`
- **memory:** 256 MB is plenty (batch ETL is IO-bound)
- **timeout:** 15 min (the hard ceiling — see `MAX_BATCHES` if you want to
  cap shorter)
- **reserved concurrency:** 1 (prevents EventBridge double-fires from running
  two ETLs against the same watermark)
- **env vars:** `SOURCE_DB_URL`, `TARGET_DB_URL`, plus optional knobs

EventBridge rule (UTC):

```
cron(0 9 * * ? *)   # 09:00 UTC daily
```

No Lambda layer needed — pg8000 is pure Python.

## Idempotency

- Fact insert uses `ON CONFLICT (player_tag, battle_id) DO NOTHING`.
- Watermark advance is in the same transaction as the fact insert; if
  anything fails after that point the txn rolls back and the next run
  replays cleanly.
- `brawler_dim` and `battle_dim` upserts use `ON CONFLICT … DO UPDATE`
  variants so they hydrate the cache without erroring on existing rows.

## Operational gotchas

- **New brawler released**: ETL inserts a placeholder
  `(brawler_id, 'unknown-{id}', NULL)` row and logs `WARN`. Patch the name
  and class via a follow-up `UPDATE`.
- **New mode added**: `MODE_NAMES` in `transform.py` falls back to
  `f"mode-{id}"`. Update the dict (and re-deploy) to give the row a real
  name. Already-loaded `battle_dim` rows keep the stale name until
  manually fixed.
- **Brawler classes**: the migration left recent brawlers' `class` as NULL
  — update those when verified.
