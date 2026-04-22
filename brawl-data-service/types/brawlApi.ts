// Raw shapes returned by the Brawl Stars public API.
// Only the fields we actually consume are modelled.

export interface RawBrawler {
  id: number;
  name: string;
  power: number;
  trophies: number;
}

export interface RawPlayer {
  tag: string;
  name: string;
  brawler: RawBrawler;
}

export interface RawEvent {
  id: number;
  mode: string;
  modeId?: number;
  map: string;
}

// Showdown battles expose a flat `players` list and use `rank`.
// Team modes expose `teams` (array of two arrays of players) and use `result`.
// `trophyChange` is sometimes absent (treated as 0 downstream).
export interface RawBattleDetails {
  mode: string;
  type: string;
  result?: 'victory' | 'defeat' | 'draw';
  rank?: number;
  trophyChange?: number;
  duration?: number;
  starPlayer?: RawPlayer | null;
  players?: RawPlayer[];
  teams?: RawPlayer[][];
}

export interface RawBattle {
  battleTime: string;
  event: RawEvent;
  battle: RawBattleDetails;
}

export interface RawBattleLog {
  items: RawBattle[];
}
