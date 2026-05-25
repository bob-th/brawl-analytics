"""pg8000 connection helpers.

Supabase Postgres needs TLS; pg8000 enables it automatically when an `ssl_context`
is passed. We default to the system trust store.
"""
from __future__ import annotations

import ssl
from contextlib import contextmanager

import pg8000.dbapi

from .config import parse_db_url


def _ssl_context() -> ssl.SSLContext:
    # Supabase certs chain to a public CA; the default system context verifies them.
    return ssl.create_default_context()


@contextmanager
def connect(url: str):
    """Yield a pg8000 connection, closing it on exit."""
    kwargs = parse_db_url(url)
    conn = pg8000.dbapi.connect(ssl_context=_ssl_context(), **kwargs)
    try:
        yield conn
    finally:
        conn.close()
