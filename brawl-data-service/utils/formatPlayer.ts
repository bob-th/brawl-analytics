import type { RawPlayerInfo } from '../types/brawlApi.ts';
import type { FormattedPlayerInfo, FormattedClub } from '../types/player.ts';

function formatClub(raw: RawPlayerInfo['club']): FormattedClub | null {
  if (!raw || !raw.tag || !raw.name) return null;
  return { tag: raw.tag, name: raw.name };
}

export function formatPlayerInfo(raw: RawPlayerInfo): FormattedPlayerInfo {
  return {
    playerTag: raw.tag,
    name: raw.name,
    trophies: raw.trophies,
    highestTrophies: raw.highestTrophies,
    prestigeLevel: raw.totalPrestigeLevel,
    victories3v3: raw['3vs3Victories'],
    soloVictories: raw.soloVictories,
    duoVictories: raw.duoVictories,
    club: formatClub(raw.club),
  };
}
