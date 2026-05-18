"""Analytics writes: dim caches, dim upserts, fact insert, watermark advance."""
from __future__ import annotations

from datetime import datetime


# -----------------------------------------------------------------------------
# Watermark
# -----------------------------------------------------------------------------

def read_watermark(conn, key: str) -> datetime:
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT last_processed_created_at FROM public.etl_state WHERE key = %s",
            (key,),
        )
        row = cur.fetchone()
        if not row:
            raise RuntimeError(
                f"no etl_state row for key={key!r}; apply migration 20260518030000"
            )
        return row[0]
    finally:
        cur.close()


def write_watermark(conn, key: str, when: datetime) -> None:
    cur = conn.cursor()
    try:
        cur.execute(
            """
            UPDATE public.etl_state
            SET last_processed_created_at = %s,
                updated_at = now()
            WHERE key = %s
            """,
            (when, key),
        )
    finally:
        cur.close()


# -----------------------------------------------------------------------------
# Dim caches
# -----------------------------------------------------------------------------

def load_brawler_dim(conn) -> dict[int, int]:
    cur = conn.cursor()
    try:
        cur.execute("SELECT brawler_id, brawler_key FROM public.brawler_dim")
        return {bid: bkey for bid, bkey in cur.fetchall()}
    finally:
        cur.close()


def load_trophy_bands(conn) -> list[tuple[int, int, int]]:
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT trophy_band_key, band_min, band_max FROM public.trophy_band_dim"
        )
        return [(k, lo, hi) for k, lo, hi in cur.fetchall()]
    finally:
        cur.close()


def load_brawler_trophy_bands(conn) -> list[tuple[int, int, int]]:
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT brawler_trophy_band_key, band_min, band_max "
            "FROM public.brawler_trophy_band_dim"
        )
        return [(k, lo, hi) for k, lo, hi in cur.fetchall()]
    finally:
        cur.close()


def load_battle_dim(conn) -> dict[tuple[str, str], int]:
    cur = conn.cursor()
    try:
        cur.execute("SELECT mode, map, battle_dim_key FROM public.battle_dim")
        return {(mode, m): k for mode, m, k in cur.fetchall()}
    finally:
        cur.close()


# -----------------------------------------------------------------------------
# Dim upserts
# -----------------------------------------------------------------------------

def upsert_battle_dim(
    conn,
    combos: list[tuple[str, int | None, str]],
    cache: dict[tuple[str, str], int],
) -> None:
    """Upsert `(mode, mode_id, map)` rows and hydrate `cache` with the keys."""
    if not combos:
        return
    cur = conn.cursor()
    try:
        # DO UPDATE on a no-op write is the canonical trick to make
        # RETURNING fire on conflict (DO NOTHING suppresses RETURNING).
        cur.execute(
            """
            INSERT INTO public.battle_dim (mode, mode_id, map)
            SELECT * FROM unnest(%s::text[], %s::smallint[], %s::text[])
            ON CONFLICT (mode, map) DO UPDATE SET mode_id = EXCLUDED.mode_id
            RETURNING battle_dim_key, mode, map
            """,
            (
                [c[0] for c in combos],
                [c[1] for c in combos],
                [c[2] for c in combos],
            ),
        )
        for key, mode, map_name in cur.fetchall():
            cache[(mode, map_name)] = key
    finally:
        cur.close()


def register_unknown_brawlers(
    conn,
    brawler_ids: list[int],
    cache: dict[int, int],
) -> None:
    """Insert placeholder brawler_dim rows for unseen ids and update cache."""
    if not brawler_ids:
        return
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO public.brawler_dim (brawler_id, name, class)
            SELECT id, 'unknown-' || id, NULL
            FROM unnest(%s::int[]) AS t(id)
            ON CONFLICT (brawler_id) DO UPDATE SET brawler_id = EXCLUDED.brawler_id
            RETURNING brawler_id, brawler_key
            """,
            (brawler_ids,),
        )
        for bid, bkey in cur.fetchall():
            cache[bid] = bkey
            print(f"WARN: registered unknown brawler_id={bid} as placeholder")
    finally:
        cur.close()


# -----------------------------------------------------------------------------
# Fact insert
# -----------------------------------------------------------------------------

_INSERT_FACT_SQL = """
INSERT INTO public.brawler_fact (
  player_tag, battle_id, date_key, brawler_key, battle_dim_key,
  trophy_band_key, brawler_trophy_band_key, battle_time,
  placement, overall_trophies, brawler_trophies, trophy_change
)
VALUES {placeholders}
ON CONFLICT (player_tag, battle_id) DO NOTHING
"""

_COLS_PER_ROW = 12


def insert_facts(conn, fact_rows: list[tuple]) -> int:
    """Bulk-insert fact tuples. Returns the count attempted (not insertion count —
    duplicates are silently dropped by ON CONFLICT DO NOTHING)."""
    if not fact_rows:
        return 0
    placeholder_one = "(" + ", ".join(["%s"] * _COLS_PER_ROW) + ")"
    placeholders = ", ".join([placeholder_one] * len(fact_rows))
    sql = _INSERT_FACT_SQL.format(placeholders=placeholders)
    flat: list = []
    for row in fact_rows:
        if len(row) != _COLS_PER_ROW:
            raise ValueError(
                f"fact row has {len(row)} values, expected {_COLS_PER_ROW}"
            )
        flat.extend(row)
    cur = conn.cursor()
    try:
        cur.execute(sql, flat)
        return len(fact_rows)
    finally:
        cur.close()
