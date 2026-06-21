"""End-to-end ETL orchestration: extract → transform → load, in batches."""
from __future__ import annotations

import extract, load, transform
from config import Config


def run_etl(src_conn, tgt_conn, cfg: Config) -> dict:
    """Run the ETL to exhaustion (or until MAX_BATCHES). Returns a summary dict.

    Each batch is a separate transaction on the target connection:
        BEGIN -> (battle_dim upsert) -> insert facts -> update watermark -> COMMIT
    Failure rolls back the batch; next run replays it via the unchanged
    watermark and ON CONFLICT DO NOTHING on the fact.
    """
    watermark = load.read_watermark(tgt_conn, cfg.etl_key)
    brawlers = load.load_brawler_dim(tgt_conn)
    trophy_bands = load.load_trophy_bands(tgt_conn)
    brawler_trophy_bands = load.load_brawler_trophy_bands(tgt_conn)
    battle_dim_cache = load.load_battle_dim(tgt_conn)
    tgt_conn.commit()  # release any implicit txn started by the SELECTs

    batches_done = 0
    rows_seen = 0

    while True:
        if cfg.max_batches and batches_done >= cfg.max_batches:
            print(f"hit MAX_BATCHES={cfg.max_batches}, stopping")
            break

        rows = extract.fetch_batch(src_conn, watermark, cfg.batch_size)
        if not rows:
            break

        new_brawlers = transform.collect_unknown_brawler_ids(rows, brawlers)
        if new_brawlers:
            load.register_unknown_brawlers(tgt_conn, new_brawlers, brawlers)

        new_combos = transform.collect_new_mode_map_combos(rows, battle_dim_cache)
        if new_combos:
            load.upsert_battle_dim(tgt_conn, new_combos, battle_dim_cache)

        fact_rows = [
            transform.transform_row(
                r,
                brawlers=brawlers,
                trophy_bands=trophy_bands,
                brawler_trophy_bands=brawler_trophy_bands,
                battle_dim_cache=battle_dim_cache,
            )
            for r in rows
        ]

        load.insert_facts(tgt_conn, fact_rows)
        new_watermark = max(r["created_at"] for r in rows)
        load.write_watermark(tgt_conn, cfg.etl_key, new_watermark)
        tgt_conn.commit()

        watermark = new_watermark
        batches_done += 1
        rows_seen += len(rows)
        print(
            f"batch {batches_done}: {len(rows)} rows, "
            f"watermark={new_watermark.isoformat()}"
        )

        if len(rows) < cfg.batch_size:
            break  # last partial batch — drained

    return {
        "batches": batches_done,
        "rows": rows_seen,
        "final_watermark": watermark.isoformat() if rows_seen else None,
    }
