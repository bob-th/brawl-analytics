export interface RecentBattle {
  battleTime: string;
  modeId: number;
  map: string;
  brawler: number;
  brawlerTrophies: number;
  trophies: number;
  trophyChange: number;
  result: string | number;
}

export interface RecentBattlesResponse {
  playerTag: string;
  limit: number;
  offset: number;
  battles: RecentBattle[];
}

export interface PlayerClub {
  tag: string;
  name: string;
}

export interface PlayerProfile {
  playerTag: string;
  name: string;
  trophies: number;
  highestTrophies?: number;
  prestigeLevel?: number;
  victories3v3?: number;
  soloVictories?: number;
  duoVictories?: number;
  club?: PlayerClub | null;
}
