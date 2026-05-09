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
  intervals: OutcomeCell[];
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

export interface OutcomeCell {
  wins: number;
  draws: number;
  losses: number;
}

export interface PlayerMetrics {
  playerTag: string;
  overall: OutcomeCell;
  modes: Record<string, OutcomeCell>;
  brawlers: Record<string, OutcomeCell>;
}

export interface UnifiedBattle {
  battleTime: string;
  trophies: number;
  result: string | number;
  trophyChange: number;
}

export interface PlayerBattlesResponse {
  playerTag: string;
  battles: UnifiedBattle[];
}

export interface PlayerBrawlerBattlesResponse {
  playerTag: string;
  brawler: number;
  limit: number;
  offset: number;
  battles: RecentBattle[];
  intervals: OutcomeCell[];
}

export type BattlePageSource = 'recent' | 'brawler';

export interface BattlePage {
  battles: RecentBattle[];
  metrics: OutcomeCell;
  pageIndex: number;
  isLastPage: boolean;
}
