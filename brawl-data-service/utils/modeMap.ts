// Our internal mode-name -> mode-id mapping. Decoupled from the Brawl API's
// `event.modeId` so we control the id space. Extend as new modes are observed.
export const MODE_IDS: Record<string, number> = {
  soloShowdown: 1,
  duoShowdown: 2,
  bounty: 3,
  brawlBall: 4,
  hotZone: 5,
};

export function getModeId(mode: string): number | null {
  if(!(mode in MODE_IDS)) console.error("unidentified id:", mode)
  return MODE_IDS[mode] ?? null;
}
