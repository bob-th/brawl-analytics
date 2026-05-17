// Shapes the data service sends to the backend.
// Mirrors the fields we persist (battle_info, battle_log, brawler_trophies_store)
// plus what the frontend renders.

export interface FormattedPlayer {
  playerTag: string;
  brawlerId: number;
  brawlerName: string;
  trophies: number;
  // Per-participant outcome.
  //   Team modes:    1 = victory, 0 = loss, -1 = draw
  //   Solo showdown: 1..10 (finish position from API players[] order)
  //   Showdown duo:  1..N  (team finish position from API teams[] order)
  //   null:          outcome could not be derived (defensive fallback)
  placement: number | null;
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
