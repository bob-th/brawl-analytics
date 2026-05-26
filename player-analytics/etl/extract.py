"""OLTP read query — fetches one batch of new rows since the watermark."""
from __future__ import annotations

from datetime import datetime

# Column order MUST match what transform.transform_row expects to read.
_EXTRACT_SQL = """
SELECT
  bts.player_tag,
  bts.battle_time,
  bts.battle_id,
  bts.brawler,
  bts.brawler_trophies,
  bts.placement,
  bts.created_at,
  bi.mode_id,
  bi.map,
  bl.trophies      AS overall_trophies,
  bl.trophy_change
FROM private.brawler_trophies_store bts
JOIN private.battle_info bi
  ON bi.battle_id = bts.battle_id
LEFT JOIN private.battle_log bl
  ON bl.player_tag = bts.player_tag
 AND bl.battle_time = bts.battle_time
WHERE bts.created_at >= %s
ORDER BY bts.created_at, bts.battle_time, bts.player_tag
LIMIT %s
"""

_COLUMNS = (
    "player_tag",
    "battle_time",
    "battle_id",
    "brawler",
    "brawler_trophies",
    "placement",
    "created_at",
    "mode_id",
    "map",
    "overall_trophies",
    "trophy_change",
)


def fetch_batch(conn, watermark: datetime, batch_size: int) -> list[dict]:
    """Return up to `batch_size` rows from OLTP with created_at > watermark."""
    cur = conn.cursor()
    try:
        cur.execute(_EXTRACT_SQL, (watermark, batch_size))
        return [dict(zip(_COLUMNS, row)) for row in cur.fetchall()]
    finally:
        cur.close()
