import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getModeId, MODE_IDS } from '../utils/modeMap.ts';

describe('getModeId', () => {
  it('returns our internal id for known modes', () => {
    assert.equal(getModeId('soloShowdown'), MODE_IDS.soloShowdown);
    assert.equal(getModeId('brawlBall'), MODE_IDS.brawlBall);
    assert.equal(getModeId('hotZone'), MODE_IDS.hotZone);
  });

  it('returns null for unknown modes', () => {
    assert.equal(getModeId('futureModeTBD'), null);
  });
});
