// Shapes the data service sends to the backend.
// Mirrors the fields we persist (battle_info, battle_log, brawler_trophies_store)
// plus what the frontend renders.

export interface FormattedPlayer {
  playerTag: string;
  brawlerId: number;
  brawlerName: string;
  trophies: number;
}

export interface FormattedBattle {
  battleId: string;
  battleTime: string;
  mode: string;
  modeId: number | null;
  map: string;
  trophyChange: number;
  // Player's total trophies immediately after this battle resolved.
  // Reconstructed from current trophies by walking battles newest -> oldest.
  totalTrophies: number;
  isShowdown: boolean;
  // Exactly one of these is set: result for team modes, rank for showdown.
  result: 'victory' | 'defeat' | 'draw' | null;
  rank: number | null;
  players: FormattedPlayer[];
}

export interface FormattedBattleLog {
  battles: FormattedBattle[];
}
