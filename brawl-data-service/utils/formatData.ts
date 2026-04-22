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
    brawlerName: p.brawler.name,
    trophies: p.brawler.trophies,
  };
}

// Returns null for ranked matches (no trophyChange) so they can be dropped.
function formatBattle(raw: RawBattle): FormattedBattle | null {
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

export function formatBattleLog(raw: RawBattleLog): FormattedBattle[] {
  return raw.items
    .map(formatBattle)
    .filter((b): b is FormattedBattle => b !== null);
}
