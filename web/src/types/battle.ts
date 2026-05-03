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
