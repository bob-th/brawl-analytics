import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildBatchRows } from '../services/battleRows.ts';
import type { BattleGroup } from '../services/battleRows.ts';
import type { FormattedBattle, FormattedPlayer } from '../types/battle.ts';

function player(overrides: Partial<FormattedPlayer> = {}): FormattedPlayer {
  return {
    playerTag: '#AAA',
    brawlerId: 1,
    brawlerName: 'SHELLY',
    trophies: 500,
    placement: 1,
    ...overrides,
  };
}

function battle(overrides: Partial<FormattedBattle> = {}): FormattedBattle {
  return {
    battleId: 'b1',
    battleTime: '20260420T222509.000Z',
    mode: 'gemGrab',
    modeId: 1,
    map: 'Hard Rock Mine',
    trophyChange: 8,
    totalTrophies: 500,
    battleLevel: 500,
    isShowdown: false,
    result: 'victory',
    rank: null,
    players: [player()],
    ...overrides,
  };
}

describe('buildBatchRows', () => {
  it('maps battle fields onto the three row shapes and converts battleTime to ISO', () => {
    const groups: BattleGroup[] = [
      {
        queryPlayerTag: '#P1',
        battles: [
          battle({
            players: [
              player({ playerTag: '#P1', brawlerId: 16, trophies: 600, placement: 1 }),
            ],
          }),
        ],
      },
    ];

    const { infoRows, logRows, brawlerTrophiesRows } = buildBatchRows(groups);

    assert.deepEqual(infoRows, [
      { battle_id: 'b1', mode_id: 1, map: 'Hard Rock Mine', battle_level: 500 },
    ]);
    assert.deepEqual(logRows, [
      {
        player_tag: '#P1',
        battle_time: '2026-04-20T22:25:09.000Z',
        battle_id: 'b1',
        result: 'victory',
        rank: null,
        trophy_change: 8,
        trophies: 500,
      },
    ]);
    assert.deepEqual(brawlerTrophiesRows, [
      {
        player_tag: '#P1',
        battle_time: '2026-04-20T22:25:09.000Z',
        brawler: 16,
        brawler_trophies: 600,
        battle_id: 'b1',
        placement: 1,
      },
    ]);
  });

  it('de-duplicates battle_info and brawler rows when two queried players share a battle', () => {
    // Both queried players were in the same battle, so each group reports the
    // same battle (same battle_id, same battle_time) with the same participant
    // list — the cross-player collision batching introduces.
    const participants = [
      player({ playerTag: '#P1', brawlerId: 1, trophies: 600, placement: 1 }),
      player({ playerTag: '#P2', brawlerId: 2, trophies: 550, placement: 0 }),
    ];
    const shared = battle({ battleId: 'shared', players: participants });
    const groups: BattleGroup[] = [
      { queryPlayerTag: '#P1', battles: [shared] },
      { queryPlayerTag: '#P2', battles: [shared] },
    ];

    const { infoRows, logRows, brawlerTrophiesRows } = buildBatchRows(groups);

    // battle_info collapses to one row (deduped on battle_id).
    assert.equal(infoRows.length, 1);
    assert.equal(infoRows[0]?.battle_id, 'shared');

    // battle_log keeps one row per query player (distinct player_tag).
    assert.equal(logRows.length, 2);
    assert.deepEqual(logRows.map((r) => r.player_tag).sort(), ['#P1', '#P2']);

    // brawler_trophies: each participant appears once despite being emitted by
    // both groups (deduped on player_tag + battle_time).
    assert.equal(brawlerTrophiesRows.length, 2);
    assert.deepEqual(
      brawlerTrophiesRows.map((r) => r.player_tag).sort(),
      ['#P1', '#P2'],
    );
  });

  it('de-duplicates battle_log by (player_tag, battle_time)', () => {
    const groups: BattleGroup[] = [
      {
        queryPlayerTag: '#P1',
        battles: [
          battle({ players: [player({ playerTag: '#P1' })] }),
          battle({ players: [player({ playerTag: '#P1' })] }),
        ],
      },
    ];

    const { logRows } = buildBatchRows(groups);
    assert.equal(logRows.length, 1);
  });

  it('defaults a missing trophyChange to 0 and preserves null placement', () => {
    const groups: BattleGroup[] = [
      {
        queryPlayerTag: '#P1',
        battles: [
          battle({
            trophyChange: undefined,
            players: [player({ placement: null })],
          }),
        ],
      },
    ];

    const { logRows, brawlerTrophiesRows } = buildBatchRows(groups);
    assert.equal(logRows[0]?.trophy_change, 0);
    assert.equal(brawlerTrophiesRows[0]?.placement, null);
  });

  it('returns empty arrays for empty input', () => {
    assert.deepEqual(buildBatchRows([]), {
      infoRows: [],
      logRows: [],
      brawlerTrophiesRows: [],
    });
    assert.deepEqual(buildBatchRows([{ queryPlayerTag: '#P1', battles: [] }]), {
      infoRows: [],
      logRows: [],
      brawlerTrophiesRows: [],
    });
  });
});
