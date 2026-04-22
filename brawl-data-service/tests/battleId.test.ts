import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { computeBattleId } from '../utils/battleId.ts';

describe('computeBattleId', () => {
  it('is order-independent (sorted-min tag anchor)', () => {
    const time = '20260420T222509.000Z';
    const a = computeBattleId(['#AAA', '#BBB', '#CCC'], time);
    const b = computeBattleId(['#CCC', '#AAA', '#BBB'], time);
    const c = computeBattleId(['#BBB', '#CCC', '#AAA'], time);
    assert.equal(a, b);
    assert.equal(a, c);
  });

  it('matches the documented md5(anchor|battleTime) formula', () => {
    const tags = ['#ZZZ', '#AAA', '#MMM'];
    const time = '20260101T000000.000Z';
    const expected = createHash('md5').update('#AAA|20260101T000000.000Z').digest('hex');
    assert.equal(computeBattleId(tags, time), expected);
  });

  it('differs when battleTime differs', () => {
    const tags = ['#AAA', '#BBB'];
    const id1 = computeBattleId(tags, '20260101T000000.000Z');
    const id2 = computeBattleId(tags, '20260101T000001.000Z');
    assert.notEqual(id1, id2);
  });

  it('throws on empty tag list', () => {
    assert.throws(() => computeBattleId([], '20260101T000000.000Z'));
  });
});
