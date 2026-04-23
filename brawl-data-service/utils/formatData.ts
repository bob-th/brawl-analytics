import type { RawBattle, RawBattleLog, RawPlayer } from '../types/brawlApi.ts';
import type { FormattedBattle, FormattedPlayer } from '../types/battle.ts';
import { getModeId } from './modeMap.ts';
import { computeBattleId } from './battleId.ts';

function collectParticipants(raw: RawBattle): RawPlayer[] {
  if (raw.battle.players) return raw.battle.players;
  if (raw.battle.teams) return raw.battle.teams.flat();
  return [];
}

function toFormattedPlayer(p: RawPlayer): FormattedPlayer {
  return {
    playerTag: p.tag,
    brawlerId: p.brawler.id,
    brawlerName: p.brawler.name,
    trophies: p.brawler.trophies,
  };
}

// Returns null for ranked matches (no trophyChange) so they can be dropped.
// totalTrophies is filled in by the caller after ranked matches are stripped.
function formatBattle(raw: RawBattle): Omit<FormattedBattle, 'totalTrophies'> | null {
  if (raw.battle.trophyChange === undefined) return null;

  const participants = collectParticipants(raw);
  const tags = participants.map(p => p.tag);
  const battleId = computeBattleId(tags, raw.battleTime);

  const isShowdown = raw.battle.mode.toLowerCase().includes('showdown');

  return {
    battleId,
    battleTime: raw.battleTime,
    mode: raw.battle.mode,
    modeId: getModeId(raw.battle.mode),
    map: raw.event.map,
    trophyChange: raw.battle.trophyChange,
    isShowdown,
    result: isShowdown ? null : raw.battle.result ?? null,
    rank: isShowdown ? raw.battle.rank ?? null : null,
    players: participants.map(toFormattedPlayer),
  };
}

// Attaches the player's trophy total at the moment each battle resolved.
// Assumes `items` are newest-first (Brawl API convention): the first retained
// battle's totalTrophies equals `currentTrophies`, and each older entry peels
// off the next newer battle's trophyChange.
export function formatBattleLog(
  raw: RawBattleLog,
  currentTrophies: number,
): FormattedBattle[] {
  const cleaned = raw.items
    .map(formatBattle)
    .filter((b): b is Omit<FormattedBattle, 'totalTrophies'> => b !== null);

  let running = currentTrophies;
  const out: FormattedBattle[] = [];
  for (const b of cleaned) {
    out.push({ ...b, totalTrophies: running });
    running -= b.trophyChange;
  }
  return out;
}
