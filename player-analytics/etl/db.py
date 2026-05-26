"""pg8000 connection helpers.

Supabase Postgres needs TLS; pg8000 enables it whenever an `ssl_context` is
passed. Supabase's direct + pooler certs chain to a Supabase-internal root
that is NOT in the public trust store, so full verification fails unless you
supply that CA cert. SSL behaviour is therefore configurable:

  - "require" (default): encrypt but skip cert verification. Matches the
    behaviour of Supabase's own connection-string examples.
  - "verify-full": verify the cert (and hostname). Requires DB_SSL_ROOT_CERT
    to point at Supabase's downloaded CA cert.
"""
from __future__ import annotations

import ssl
from contextlib import contextmanager

import pg8000.dbapi

from config import parse_db_url


def _ssl_context(ssl_mode: str, ssl_root_cert: str | None) -> ssl.SSLContext:
    ctx = (
        ssl.create_default_context(cafile=ssl_root_cert)
        if ssl_root_cert
        else ssl.create_default_context()
    )
    if ssl_mode == "require":
        # Encrypted, but unauthenticated — the cert chain isn't publicly trusted.
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    elif ssl_mode != "verify-full":
        raise ValueError(
            f"unknown DB_SSL_MODE: {ssl_mode!r} (use 'require' or 'verify-full')"
        )
    return ctx


@contextmanager
def connect(
    url: str,
    ssl_mode: str = "require",
    ssl_root_cert: str | None = None,
    connect_timeout: int = 10,
):
    """Yield a pg8000 connection, closing it on exit.

    `connect_timeout` bounds the socket connect (seconds). Without it pg8000
    passes timeout=None and a black-holed host (e.g. an unreachable VPC route
    or the IPv6-only Supabase *direct* endpoint behind an IPv4 NAT) hangs
    until the Lambda's own ceiling instead of failing fast.
    """
    kwargs = parse_db_url(url)
    conn = pg8000.dbapi.connect(
        ssl_context=_ssl_context(ssl_mode, ssl_root_cert),
        timeout=connect_timeout,
        **kwargs,
    )
    try:
        yield conn
    finally:
        conn.close()
