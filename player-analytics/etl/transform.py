"""Pure transform functions — no DB, no IO.

Anything in this module should be unit-testable without a Postgres handy.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

# Reverse of brawl-data-service/utils/modeMap.ts. Keep in sync when modes
# are added there. Unknown ids fall through to f"mode-{id}" — the OLTP side
# already logged a warning, no need to crash the ETL.
MODE_NAMES: dict[int, str] = {
    1: "soloShowdown",
    2: "duoShowdown",
    3: "gemGrab",
    4: "bounty",
    5: "brawlBall",
    6: "hotZone",
    7: "knockout",
    8: "heist",
    9: "basketBrawl",
    10: "wipeout",
    11: "brawlHockey",
    12: "duels",
    13: "brawlArena",
}


def mode_name(mode_id: int | None) -> str:
    if mode_id is None:
        return "mode-unknown"
    return MODE_NAMES.get(mode_id, f"mode-{mode_id}")


def date_key_from(dt: datetime) -> int:
    """Return YYYYMMDD int for the UTC calendar date of `dt`."""
    if dt.tzinfo is None:
        # Treat naive timestamps as UTC. OLTP stores timestamptz so this
        # shouldn't happen, but a pg8000 quirk could surface a naive dt.
        dt = dt.replace(tzinfo=timezone.utc)
    dt_utc = dt.astimezone(timezone.utc)
    return int(dt_utc.strftime("%Y%m%d"))


def find_band(value: int | None, bands: Iterable[tuple[int, int, int]]) -> int | None:
    """Return the band_key whose [band_min, band_max] inclusively contains `value`.

    `bands` is iterable of (band_key, band_min, band_max). Returns None if
    `value` is None. Raises ValueError if value falls outside all bands
    (callers handle this — for brawler trophies, our overflow band covers
    everything ≥ 4000 so this shouldn't fire).
    """
    if value is None:
        return None
    for key, lo, hi in bands:
        if lo <= value <= hi:
            return key
    raise ValueError(f"value {value} fell outside all trophy bands")


def transform_row(
    row: dict,
    *,
    brawlers: dict[int, int],
    trophy_bands: list[tuple[int, int, int]],
    brawler_trophy_bands: list[tuple[int, int, int]],
    battle_dim_cache: dict[tuple[str, str], int],
) -> tuple:
    """Map an extracted OLTP row to the 12-tuple `brawler_fact` INSERT expects.

    Column order (must match the INSERT statement in load.py):
        player_tag, battle_id, date_key, brawler_key, battle_dim_key,
        trophy_band_key, brawler_trophy_band_key, battle_time,
        placement, overall_trophies, brawler_trophies, trophy_change
    """
    brawler_id = row["brawler"]
    try:
        brawler_key = brawlers[brawler_id]
    except KeyError as e:
        # Caller is responsible for inserting a placeholder brawler_dim row
        # and refreshing the cache before re-calling. Keeping the insert path
        # outside this pure function preserves testability.
        raise KeyError(
            f"brawler_id {brawler_id} not in brawler_dim cache"
        ) from e

    mode_id = row["mode_id"]
    name = mode_name(mode_id)
    map_name = row["map"]
    battle_dim_key = battle_dim_cache[(name, map_name)]

    return (
        row["player_tag"],
        row["battle_id"],
        date_key_from(row["battle_time"]),
        brawler_key,
        battle_dim_key,
        find_band(row.get("overall_trophies"), trophy_bands),
        find_band(row["brawler_trophies"], brawler_trophy_bands),
        row["battle_time"],
        row.get("placement"),
        row.get("overall_trophies"),
        row["brawler_trophies"],
        # trophy_change is NOT NULL on the fact; non-targeted participants
        # have no battle_log row so their value is NULL upstream — coerce to 0.
        # This conflates "no change" with "unknown" for non-targeted players;
        # acceptable for the analytics use cases currently in scope.
        row.get("trophy_change") or 0,
    )


def collect_new_mode_map_combos(
    rows: list[dict],
    battle_dim_cache: dict[tuple[str, str], int],
) -> list[tuple[str, int | None, str]]:
    """Return the (mode_name, mode_id, map) tuples in `rows` not yet cached.

    Order is preserved (first-seen) and duplicates within the batch are
    collapsed. Caller upserts these into battle_dim and refreshes the cache
    before transforming the rows.
    """
    seen: set[tuple[str, str]] = set()
    out: list[tuple[str, int | None, str]] = []
    for r in rows:
        name = mode_name(r["mode_id"])
        map_name = r["map"]
        key = (name, map_name)
        if key in battle_dim_cache or key in seen:
            continue
        seen.add(key)
        out.append((name, r["mode_id"], map_name))
    return out


def collect_unknown_brawler_ids(
    rows: list[dict],
    brawlers: dict[int, int],
) -> list[int]:
    """Return unique brawler_ids in `rows` missing from the brawlers cache."""
    seen: set[int] = set()
    out: list[int] = []
    for r in rows:
        bid = r["brawler"]
        if bid in brawlers or bid in seen:
            continue
        seen.add(bid)
        out.append(bid)
    return out
