import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { formatBattleLog } from '../utils/formatData.ts';
import type { RawBattleLog } from '../types/brawlApi.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = resolve(here, '../../local/api_response_example.json');
const sample = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as RawBattleLog;
const CURRENT_TROPHIES = 1000;
const QUERY_TAG = '#2JCJG00'; // Dildate — present in every fixture battle.

describe('formatBattleLog', () => {
  it('drops battles without a trophyChange (ranked matches)', () => {
    // Sample has 5 battles: 2 with trophyChange (soloShowdown, hotZone),
    // 3 ranked matches without it (brawlBall, bounty, brawlBall).
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    assert.equal(out.length, 2);
    for (const b of out) {
      assert.equal(typeof b.trophyChange, 'number');
    }
  });

  it('formats the showdown battle with rank, no result, flat player list', () => {
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
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
      brawlerId: 16000103,
      brawlerName: 'NAJIA',
      trophies: 27,
      placement: 1,
    });
    // Last player by API order is 10th place.
    assert.equal(showdown.players[9]!.placement, 10);
  });

  it('formats a team-mode battle with result, no rank, flattened teams', () => {
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    const team = out.find(b => b.mode === 'hotZone');
    assert.ok(team, 'hotZone battle should be present');
    assert.equal(team.isShowdown, false);
    assert.equal(team.result, 'victory');
    assert.equal(team.rank, null);
    assert.equal(team.trophyChange, 1);
    assert.equal(team.modeId, 6);
    assert.equal(team.map, 'Open Business');
    assert.equal(team.players.length, 6);
  });

  it('derives placement 1 for queried player and teammates, 0 for opposing team on a team-mode victory', () => {
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    const team = out.find(b => b.mode === 'hotZone')!;
    // Fixture: teams[0] = tamovaleria/skypro/Leokad YT (opposing — lost),
    //          teams[1] = Dildate/elinsano golozo/симба (queried team — won).
    // collectParticipantsWithTeams emits teams[0] first, then teams[1].
    const oppTags = ['#2QC2P8YR99', '#YLQUVGYQ8', '#9V00L99VY'];
    const queryTeamTags = ['#2JCJG00', '#2GQ2UGG0JY', '#LJQQRCQYU'];
    for (const t of oppTags) {
      const p = team.players.find(pp => pp.playerTag === t)!;
      assert.equal(p.placement, 0, `${t} should be 0 (opposing team lost)`);
    }
    for (const t of queryTeamTags) {
      const p = team.players.find(pp => pp.playerTag === t)!;
      assert.equal(p.placement, 1, `${t} should be 1 (queried team won)`);
    }
  });

  it('derives placement -1 for everyone on a team-mode draw', () => {
    // Synthesize a draw by mutating the hotZone fixture battle.
    const drawSample: RawBattleLog = {
      items: sample.items.map(item =>
        item.battle.mode === 'hotZone'
          ? { ...item, battle: { ...item.battle, result: 'draw' } }
          : item,
      ),
    };
    const out = formatBattleLog(drawSample, CURRENT_TROPHIES, QUERY_TAG);
    const team = out.find(b => b.mode === 'hotZone')!;
    for (const p of team.players) {
      assert.equal(p.placement, -1, `${p.playerTag} should be -1 on draw`);
    }
  });

  it('inverts placement when queried player loses a team mode', () => {
    // Flip the hotZone fixture to a defeat.
    const lossSample: RawBattleLog = {
      items: sample.items.map(item =>
        item.battle.mode === 'hotZone'
          ? { ...item, battle: { ...item.battle, result: 'defeat' } }
          : item,
      ),
    };
    const out = formatBattleLog(lossSample, CURRENT_TROPHIES, QUERY_TAG);
    const team = out.find(b => b.mode === 'hotZone')!;
    // Dildate (queried) was in teams[1]; on defeat his team is 0, opp is 1.
    const dildate = team.players.find(p => p.playerTag === '#2JCJG00')!;
    assert.equal(dildate.placement, 0);
    const opp = team.players.find(p => p.playerTag === '#2QC2P8YR99')!;
    assert.equal(opp.placement, 1);
  });

  it('derives placement by API index for solo showdown (1-based)', () => {
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    const showdown = out.find(b => b.mode === 'soloShowdown')!;
    for (let i = 0; i < showdown.players.length; i++) {
      assert.equal(showdown.players[i]!.placement, i + 1);
    }
  });

  it('drops a team-mode battle when raw.battle.result is missing', () => {
    const noResultSample: RawBattleLog = {
      items: sample.items.map(item =>
        item.battle.mode === 'hotZone'
          ? { ...item, battle: { ...item.battle, result: undefined } }
          : item,
      ),
    };
    const out = formatBattleLog(noResultSample, CURRENT_TROPHIES, QUERY_TAG);
    assert.equal(out.find(b => b.mode === 'hotZone'), undefined);
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
    const original = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    const flipped = formatBattleLog(reversed, CURRENT_TROPHIES, QUERY_TAG);
    const origShowdown = original.find(b => b.mode === 'soloShowdown');
    const flipShowdown = flipped.find(b => b.mode === 'soloShowdown');
    assert.ok(origShowdown && flipShowdown);
    assert.equal(origShowdown.battleId, flipShowdown.battleId);
  });

  it('returns an empty array for an empty battle log', () => {
    assert.deepEqual(
      formatBattleLog({ items: [] }, CURRENT_TROPHIES, QUERY_TAG),
      [],
    );
  });

  it('drops every battle when none have trophyChange', () => {
    const allRanked: RawBattleLog = {
      items: sample.items.map(item => ({
        ...item,
        battle: { ...item.battle, trophyChange: undefined },
      })),
    };
    assert.deepEqual(
      formatBattleLog(allRanked, CURRENT_TROPHIES, QUERY_TAG),
      [],
    );
  });

  it('anchors totalTrophies to currentTrophies on the newest battle and peels back', () => {
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    assert.ok(out.length >= 2, 'sample should retain at least 2 battles');
    const first = out[0]!;
    assert.equal(first.totalTrophies, CURRENT_TROPHIES);
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1]!;
      const curr = out[i]!;
      assert.equal(curr.totalTrophies, prev.totalTrophies - prev.trophyChange);
    }
  });

  it('sets battleLevel equal to totalTrophies for each battle', () => {
    const out = formatBattleLog(sample, CURRENT_TROPHIES, QUERY_TAG);
    assert.ok(out.length >= 2, 'sample should retain at least 2 battles');
    for (const b of out) {
      assert.equal(b.battleLevel, b.totalTrophies);
    }
  });
});
