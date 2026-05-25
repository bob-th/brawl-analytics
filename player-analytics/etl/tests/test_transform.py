"""Unit tests for the pure transform layer."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from etl.transform import (
    collect_new_mode_map_combos,
    collect_unknown_brawler_ids,
    date_key_from,
    find_band,
    mode_name,
    transform_row,
)


# Shared fixtures used across tests.

TROPHY_BANDS = [
    (1, 0, 9999),
    (2, 10000, 19999),
    (10, 90000, 99999),
    (15, 140000, 2147483647),
]

BRAWLER_TROPHY_BANDS = [
    (1, 0, 499),
    (2, 500, 999),
    (10, 2000, 2099),
    (27, 4000, 2147483647),
]

BRAWLERS = {16000000: 1, 16000103: 64}

BATTLE_DIM = {
    ("hotZone", "Open Business"): 7,
    ("soloShowdown", "Gated Community"): 11,
}


def test_mode_name_known():
    assert mode_name(6) == "hotZone"
    assert mode_name(1) == "soloShowdown"


def test_mode_name_unknown_falls_through():
    assert mode_name(999) == "mode-999"
    assert mode_name(None) == "mode-unknown"


def test_date_key_from_utc():
    dt = datetime(2026, 5, 18, 14, 30, tzinfo=timezone.utc)
    assert date_key_from(dt) == 20260518


def test_date_key_from_other_tz_normalizes_to_utc():
    from datetime import timezone as tz, timedelta
    # 23:30 in +08:00 is 15:30 UTC the same day.
    dt = datetime(2026, 5, 18, 23, 30, tzinfo=tz(timedelta(hours=8)))
    assert date_key_from(dt) == 20260518


def test_date_key_from_naive_treated_as_utc():
    dt = datetime(2026, 5, 18, 0, 0)
    assert date_key_from(dt) == 20260518


def test_find_band_returns_key_for_value():
    assert find_band(0, TROPHY_BANDS) == 1
    assert find_band(9999, TROPHY_BANDS) == 1
    assert find_band(10000, TROPHY_BANDS) == 2
    assert find_band(95000, TROPHY_BANDS) == 10
    assert find_band(150000, TROPHY_BANDS) == 15


def test_find_band_none_returns_none():
    assert find_band(None, TROPHY_BANDS) is None


def test_find_band_outside_all_raises():
    # No band for 20k-90k in the test fixture — synthetic gap.
    with pytest.raises(ValueError):
        find_band(50000, TROPHY_BANDS)


def test_transform_row_targeted_player():
    row = {
        "player_tag": "#ABC",
        "battle_id": "deadbeef",
        "battle_time": datetime(2026, 5, 18, 14, 30, tzinfo=timezone.utc),
        "brawler": 16000000,
        "brawler_trophies": 525,
        "placement": 1,
        "created_at": datetime(2026, 5, 18, 14, 31, tzinfo=timezone.utc),
        "mode_id": 6,
        "map": "Open Business",
        "overall_trophies": 95123,
        "trophy_change": 8,
    }
    out = transform_row(
        row,
        brawlers=BRAWLERS,
        trophy_bands=TROPHY_BANDS,
        brawler_trophy_bands=BRAWLER_TROPHY_BANDS,
        battle_dim_cache=BATTLE_DIM,
    )
    assert out == (
        "#ABC", "deadbeef",
        20260518,                       # date_key
        1,                              # brawler_key (Shelly -> 1)
        7,                              # battle_dim_key (hotZone/Open Business)
        10,                             # trophy_band_key (95k -> band key 10)
        2,                              # brawler_trophy_band_key (525 -> band key 2)
        datetime(2026, 5, 18, 14, 30, tzinfo=timezone.utc),
        1, 95123, 525, 8,
    )


def test_transform_row_non_targeted_player_nulls_to_zero_trophy_change():
    """Non-targeted players have no battle_log row -> overall_trophies and
    trophy_change come back NULL. trophy_band_key must be NULL too; trophy_change
    must be coerced to 0 (column is NOT NULL)."""
    row = {
        "player_tag": "#OPP",
        "battle_id": "deadbeef",
        "battle_time": datetime(2026, 5, 18, 14, 30, tzinfo=timezone.utc),
        "brawler": 16000103,
        "brawler_trophies": 2050,
        "placement": 0,
        "created_at": datetime(2026, 5, 18, 14, 31, tzinfo=timezone.utc),
        "mode_id": 6,
        "map": "Open Business",
        "overall_trophies": None,
        "trophy_change": None,
    }
    out = transform_row(
        row,
        brawlers=BRAWLERS,
        trophy_bands=TROPHY_BANDS,
        brawler_trophy_bands=BRAWLER_TROPHY_BANDS,
        battle_dim_cache=BATTLE_DIM,
    )
    assert out[5] is None       # trophy_band_key
    assert out[6] == 10         # brawler_trophy_band_key (2050 -> band key 10)
    assert out[9] is None       # overall_trophies passthrough
    assert out[11] == 0         # trophy_change coerced to 0


def test_transform_row_unknown_brawler_raises():
    row = {
        "player_tag": "#X",
        "battle_id": "x",
        "battle_time": datetime(2026, 5, 18, tzinfo=timezone.utc),
        "brawler": 99999999,            # not in cache
        "brawler_trophies": 100,
        "placement": 1,
        "created_at": datetime(2026, 5, 18, tzinfo=timezone.utc),
        "mode_id": 6,
        "map": "Open Business",
        "overall_trophies": None,
        "trophy_change": None,
    }
    with pytest.raises(KeyError):
        transform_row(
            row,
            brawlers=BRAWLERS,
            trophy_bands=TROPHY_BANDS,
            brawler_trophy_bands=BRAWLER_TROPHY_BANDS,
            battle_dim_cache=BATTLE_DIM,
        )


def test_collect_new_mode_map_combos_dedupes_and_preserves_order():
    rows = [
        {"mode_id": 6, "map": "Open Business"},      # in cache
        {"mode_id": 5, "map": "Sneaky Fields"},      # new
        {"mode_id": 5, "map": "Sneaky Fields"},      # dup within batch
        {"mode_id": 4, "map": "Shooting Star"},      # new
        {"mode_id": 1, "map": "Gated Community"},    # in cache
    ]
    out = collect_new_mode_map_combos(rows, BATTLE_DIM)
    assert out == [
        ("brawlBall", 5, "Sneaky Fields"),
        ("bounty", 4, "Shooting Star"),
    ]


def test_collect_unknown_brawler_ids():
    rows = [
        {"brawler": 16000000},
        {"brawler": 16000999},
        {"brawler": 16000999},   # dup
        {"brawler": 16000103},   # in cache
        {"brawler": 16001234},
    ]
    assert collect_unknown_brawler_ids(rows, BRAWLERS) == [16000999, 16001234]
