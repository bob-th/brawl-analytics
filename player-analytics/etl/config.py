"""Env-var config for the ETL.

All values resolved lazily via `Config.load()` so that tests can construct
their own configs without touching `os.environ`.

Locally, a `.env` file next to this package is auto-loaded if
`python-dotenv` is installed. On Lambda the env vars come from the function
configuration; `python-dotenv` is optional and just no-ops if missing.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    # Look for .env in the etl/ package dir and walk up. Silent if not found.
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass


@dataclass(frozen=True)
class Config:
    source_db_url: str
    target_db_url: str
    batch_size: int
    max_batches: int  # 0 means unlimited
    etl_key: str

    @classmethod
    def load(cls) -> "Config":
        return cls(
            source_db_url=_require_env("SOURCE_DB_URL"),
            target_db_url=_require_env("TARGET_DB_URL"),
            batch_size=int(os.environ.get("BATCH_SIZE", "1000")),
            max_batches=int(os.environ.get("MAX_BATCHES", "0")),
            etl_key=os.environ.get("ETL_KEY", "brawler_fact_load"),
        )


def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(f"missing required env var: {name}")
    return val


def parse_db_url(url: str) -> dict:
    """Parse a Postgres URL into pg8000-friendly kwargs."""
    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        raise ValueError(f"unsupported db url scheme: {parsed.scheme!r}")
    if not parsed.hostname or not parsed.username:
        raise ValueError("db url missing host or user")
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": (parsed.path or "/").lstrip("/") or "postgres",
        "user": parsed.username,
        "password": parsed.password or "",
    }
