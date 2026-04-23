// Shapes the data service sends to the backend for player-info requests.
// Raw field names are normalized (tag -> playerTag, 3vs3Victories -> victories3v3).

export interface FormattedClub {
  tag: string;
  name: string;
}

export interface FormattedPlayerInfo {
  playerTag: string;
  name: string;
  trophies: number;
  highestTrophies: number;
  prestigeLevel: number;
  victories3v3: number;
  soloVictories: number;
  duoVictories: number;
  club: FormattedClub | null;
}
