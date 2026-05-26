"""Entry points: Lambda handler + local CLI.

Both paths share `main()`. The Lambda runtime calls `lambda_handler(event, context)`;
local runs do `python -m etl.handler`.
"""
from __future__ import annotations

from config import Config
from db import connect
from pipeline import run_etl


def main() -> dict:
    cfg = Config.load()
    with connect(
        cfg.source_db_url,
        ssl_mode=cfg.ssl_mode,
        ssl_root_cert=cfg.ssl_root_cert,
        connect_timeout=cfg.connect_timeout,
    ) as src, connect(
        cfg.target_db_url,
        ssl_mode=cfg.ssl_mode,
        ssl_root_cert=cfg.ssl_root_cert,
        connect_timeout=cfg.connect_timeout,
    ) as tgt:
        summary = run_etl(src, tgt, cfg)
    print(f"done: {summary}")
    return summary


def lambda_handler(event, context):
    # Cron-only handler: event/context intentionally ignored. EventBridge
    # schedules invocations; the watermark in public.etl_state defines what
    # work to do.
    del event, context
    return main()


if __name__ == "__main__":
    main()
