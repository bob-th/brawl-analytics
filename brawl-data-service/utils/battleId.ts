import { createHash } from 'node:crypto';

// Deterministic battle id shared by every player in the same physical battle.
// Anchor = lexicographically smallest player tag, so independent ingestions
// of the same battle (different callers) produce the same id.
export function computeBattleId(playerTags: string[], battleTime: string): string {
  if (playerTags.length === 0) {
    throw new Error('computeBattleId: playerTags is empty');
  }
  const anchor = [...playerTags].sort()[0];
  return createHash('md5').update(`${anchor}|${battleTime}`).digest('hex');
}
