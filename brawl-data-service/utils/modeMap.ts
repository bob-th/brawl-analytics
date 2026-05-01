// Our internal mode-name -> mode-id mapping. Decoupled from the Brawl API's
// `event.modeId` so we control the id space. Extend as new modes are observed.
export const MODE_IDS: Record<string, number> = {
  soloShowdown: 1,
  duoShowdown: 2,
  gemGrab: 3,
  bounty: 4,
  brawlBall: 5,
  hotZone: 6,
  knockout: 7,
  heist: 8
};

export function getModeId(mode: string): number | null {
  if (!(mode in MODE_IDS)) console.error("unidentified id:", mode)
  return MODE_IDS[mode] ?? null;
}
