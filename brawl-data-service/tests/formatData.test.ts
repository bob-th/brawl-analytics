import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { formatBattleLog } from '../utils/formatData.ts';
import type { RawBattleLog } from '../types/brawlApi.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = resolve(here, '../../api_response_example.json');
const sample = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as RawBattleLog;

describe('formatBattleLog', () => {
  it('drops battles without a trophyChange (ranked matches)', () => {
    // Sample has 5 battles: 2 with trophyChange (soloShowdown, hotZone),
    // 3 ranked matches without it (brawlBall, bounty, brawlBall).
    const out = formatBattleLog(sample);
    assert.equal(out.length, 2);
    for (const b of out) {
      assert.equal(typeof b.trophyChange, 'number');
    }
  });

  it('formats the showdown battle with rank, no result, flat player list', () => {
    const out = formatBattleLog(sample);
    const showdown = out.find(b => b.mode === 'soloShowdown');
    assert.ok(showdown, 'soloShowdown battle should be present');
    assert.equal(showdown.isShowdown, true);
    assert.equal(showdown.rank, 1);
    assert.equal(showdown.result, null);
    assert.equal(showdown.trophyChange, 15);
    assert.equal(showdown.modeId, 1);
    assert.equal(showdown.map, 'Gated Community');
    assert.equal(showdown.players.length, 10);
    assert.deepEqual(showdown.players[0], {
      playerTag: '#2JCJG00',
      brawlerName: 'NAJIA',
      trophies: 27,
    });
  });

  it('formats a team-mode battle with result, no rank, flattened teams', () => {
    const out = formatBattleLog(sample);
    const team = out.find(b => b.mode === 'hotZone');
    assert.ok(team, 'hotZone battle should be present');
    assert.equal(team.isShowdown, false);
    assert.equal(team.result, 'victory');
    assert.equal(team.rank, null);
    assert.equal(team.trophyChange, 1);
    assert.equal(team.modeId, 5);
    assert.equal(team.map, 'Open Business');
    assert.equal(team.players.length, 6);
  });

  it('produces the same battleId regardless of which player viewed the battle', () => {
    // Reverse the player order for the showdown battle and confirm the id
    // still hashes to the same value (sorted-min anchor is order-independent).
    const reversed: RawBattleLog = {
      items: sample.items.map(item => {
        if (!item.battle.players) return item;
        return {
          ...item,
          battle: {
            ...item.battle,
            players: [...item.battle.players].reverse(),
          },
        };
      }),
    };
    const original = formatBattleLog(sample);
    const flipped = formatBattleLog(reversed);
    const origShowdown = original.find(b => b.mode === 'soloShowdown');
    const flipShowdown = flipped.find(b => b.mode === 'soloShowdown');
    assert.ok(origShowdown && flipShowdown);
    assert.equal(origShowdown.battleId, flipShowdown.battleId);
  });

  it('returns an empty array for an empty battle log', () => {
    assert.deepEqual(formatBattleLog({ items: [] }), []);
  });

  it('drops every battle when none have trophyChange', () => {
    const allRanked: RawBattleLog = {
      items: sample.items.map(item => ({
        ...item,
        battle: { ...item.battle, trophyChange: undefined },
      })),
    };
    assert.deepEqual(formatBattleLog(allRanked), []);
  });
});
