import type { RawBattle, RawBattleLog, RawPlayer } from '../types/brawlApi.ts';
import type { FormattedBattle, FormattedPlayer } from '../types/battle.ts';
import { getModeId } from './modeMap.ts';
import { computeBattleId } from './battleId.ts';

function toFormattedPlayer(
  p: RawPlayer,
  placement: number | null,
): FormattedPlayer {
  return {
    playerTag: p.tag,
    brawlerId: p.brawler.id,
    brawlerName: p.brawler.name,
    trophies: p.brawler.trophies,
    placement,
  };
}

// Tag normalization so leading-# / case differences between the player-info
// endpoint's tag and the battle-log participant tags don't break matching.
function normTag(t: string): string {
  return t.toUpperCase().replace(/^#/, '');
}

function teamModePlacement(
  queryResult: 'victory' | 'defeat' | 'draw',
  sameTeam: boolean,
): number {
  if (queryResult === 'draw') return -1;
  const queryPlacement = queryResult === 'victory' ? 1 : 0;
  return sameTeam ? queryPlacement : 1 - queryPlacement;
}
// Returns null for ranked matches (no trophyChange) so they can be dropped.
// totalTrophies is filled in by the caller after ranked matches are stripped.
function formatBattle(
  raw: RawBattle,
  queryPlayerTag: string,
): Omit<FormattedBattle, 'totalTrophies'> | null {
  if (raw.battle.trophyChange === undefined) return null;

  const isShowdown = raw.battle.mode.toLowerCase().includes('showdown');
  const isSoloShowdown = !!raw.battle.players && !raw.battle.teams;
  
  const participants = isSoloShowdown ? [raw.battle.players] : raw.battle.teams

  const normQ = normTag(queryPlayerTag);

  if(participants === undefined || participants[0] == undefined){
    console.log("undefined participants")
    return null
  }
 
  let players: FormattedPlayer[];

  if (isSoloShowdown) {
    // Solo showdown: position in players[] is the finish placement.
    players = participants[0].map((player, index) =>
      toFormattedPlayer(player, index),
    );
  } else if (isShowdown) {
    // Showdown duo (or any teams-based showdown): teamIdx is the team's
    // finish position. All members of the team share that placement.
    players = []

    for(let i = 0; i < participants.length; i++){
      players.push(...participants[i]!.map((player) => toFormattedPlayer(player, i)));
    }
  } else {
    // Team modes: derive from queried player's result + team membership.
    players = []

    const teamIdx = participants[0]!.find((x) => normTag(x.tag) === normQ) !== undefined ? 0 : 1;
    const queryResult = raw.battle.result ?? null;
    if (queryResult == null) return null
    for(let i = 0; i < participants.length; i++){ 
      players.push(...participants[i]!.map((player) => toFormattedPlayer(player, teamModePlacement(queryResult, teamIdx == i))));
    }
  }

  const tags = players.map(player => player.playerTag);
  const battleId = computeBattleId(tags, raw.battleTime);
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
    players,
  };
}

// Attaches the player's trophy total at the moment each battle resolved.
// Assumes `items` are newest-first (Brawl API convention): the first retained
// battle's totalTrophies equals `currentTrophies`, and each older entry peels
// off the next newer battle's trophyChange.
export function formatBattleLog(
  raw: RawBattleLog,
  currentTrophies: number,
  queryPlayerTag: string,
): FormattedBattle[] {
  const cleaned = raw.items
    .map(item => formatBattle(item, queryPlayerTag))
    .filter((b): b is Omit<FormattedBattle, 'totalTrophies'> => b !== null);

  let running = currentTrophies;
  const out: FormattedBattle[] = [];
  for (const b of cleaned) {
    out.push({ totalTrophies: running, ...b });
    running -= b.trophyChange;
  }
  return out;
}
