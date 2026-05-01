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

// Raw player-info response shapes. Mirrors the full payload from
// GET /v1/players/{tag}/ (see local/api_response_player_info.json).

export interface RawIcon {
  id: number;
}

export interface RawClub {
  tag: string;
  name: string;
}

export interface RawSkin {
  id: number;
  name: string;
}

export interface RawGadget {
  id: number;
  name: string;
}

export interface RawStarPower {
  id: number;
  name: string;
}

export interface RawBuffies {
  gadget: boolean;
  starPower: boolean;
  hyperCharge: boolean;
}

export interface RawOwnedBrawler {
  id: number;
  name: string;
  power: number;
  rank: number;
  trophies: number;
  highestTrophies: number;
  prestigeLevel: number;
  currentWinStreak: number;
  maxWinStreak: number;
  skin: RawSkin;
  gadgets: RawGadget[];
  gears: string[];
  starPowers: RawStarPower[];
  hyperCharges: string[];
  buffies: RawBuffies;
}

export interface RawPlayerInfo {
  tag: string;
  name: string;
  nameColor: string;
  icon: RawIcon;
  trophies: number;
  highestTrophies: number;
  totalPrestigeLevel: number;
  expLevel: number;
  expPoints: number;
  isQualifiedFromChampionshipChallenge: boolean;
  '3vs3Victories': number;
  soloVictories: number;
  duoVictories: number;
  bestRoboRumbleTime: number;
  bestTimeAsBigBrawler: number;
  club: RawClub;
  brawlers: RawOwnedBrawler[];
}
