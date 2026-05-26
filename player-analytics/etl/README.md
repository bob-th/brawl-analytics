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
| `DB_SSL_MODE`     | no       | `require`             | `require` (encrypt only) or `verify-full` |
| `DB_SSL_ROOT_CERT`| no       | —                     | CA cert path; required for `verify-full`  |
| `DB_CONNECT_TIMEOUT`| no     | `10`                  | socket connect timeout (s); fail fast not hang |

Both URLs use the `postgresql://user:pass@host:port/dbname` form.

### Use the Supabase pooler (not the direct endpoint)

Grab the URL from **Dashboard → Project Settings → Database → Connection
String** and use the **pooler in _session_ mode** — the pooler host
(`aws-0-<region>.pooler.supabase.com`) on **port 5432**:

```
postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Two non-obvious requirements:

- **Username carries the tenant:** it's `postgres.<project-ref>` (e.g.
  `postgres.hqvhkwzgxioitufrwzgf`), not plain `postgres`. The pooler routes
  by this.
- **Session mode (5432), not transaction mode (6543).** pg8000 caches
  server-side prepared statements; Supavisor transaction mode gives each
  transaction a possibly-different backend, so a statement prepared in one
  batch won't exist in the next and you get `prepared statement "..." does
  not exist` on multi-batch runs. Session mode pins one backend per
  connection, so pg8000 behaves as it would against a direct connection.

Do **not** use the **direct** endpoint (`db.<project-ref>.supabase.co:5432`):
it's IPv6-only on the default tier, and Lambda egresses over IPv4 (in a VPC
via NAT, or via the Lambda-managed network when not in a VPC), so it
black-holes and you get `Can't create a connection to host ...
db.<ref>.supabase.co ... port 5432`. The pooler is IPv4-reachable.

> **Passwords with special characters must be percent-encoded** in the URL
> (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`). Otherwise `urlparse`
> mangles the host/user split. The code percent-*decodes* user/password
> back, so the DB still receives the literal password.

### TLS / `DB_SSL_MODE`

Supabase's certs (direct and pooler) chain to a Supabase-internal root that
isn't in the public trust store, so the default `require` mode encrypts the
connection but skips cert verification — this is what avoids the
`CERTIFICATE_VERIFY_FAILED: self-signed certificate in certificate chain`
error. For authenticated TLS, download the CA cert from **Dashboard →
Project Settings → Database → SSL Configuration**, set
`DB_SSL_ROOT_CERT=/path/to/cert` and `DB_SSL_MODE=verify-full`.

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

> **Zip layout matters.** The modules import each other flat (`from config
> import …`, `import extract, load, transform`), not as a package. So the
> `.py` files must sit at the **root** of the zip — `handler.py`, not
> `etl/handler.py`. If `handler.py` ends up nested one level down, Lambda
> fails at import with `Unable to import module 'handler': No module named
> 'handler'`. Zip the *contents* of `etl/`, never the `etl/` folder itself.

**macOS / Linux** (from `player-analytics/etl`):

```bash
pip install -r requirements.txt -t .
zip -r ../etl.zip . -x '*.pyc' '__pycache__/*' '.venv/*' 'tests/*' '.env' '.env.example'
```

**Windows / PowerShell** (from `player-analytics\etl`):

```powershell
pip install -r requirements.txt -t .

# .\* zips the package CONTENTS (handler.py at root). `Compress-Archive
# -Path .\etl` would nest everything under etl\ and break the import.
# Compress-Archive has no exclude flag, so drop build/secret files first.
$exclude = @('tests', '.venv', '__pycache__', '.env', '.env.example')
$items = Get-ChildItem -Path .\* -Exclude $exclude
Compress-Archive -Path $items -DestinationPath ..\etl.zip -Force
```

Sanity-check the layout before uploading — `handler.py` should be top-level:

```powershell
Expand-Archive ..\etl.zip .\_ziptest -Force; Get-ChildItem .\_ziptest | Select Name
```

Upload `etl.zip` to a Python 3.12 Lambda. Set:

- **handler:** `handler.lambda_handler`  (flat zip → no `etl.` prefix)
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
