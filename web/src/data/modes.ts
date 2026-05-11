export const MODES: Record<number, string> = {
  1: 'Solo Showdown',
  2: 'Duo Showdown',
  3: 'Gem Grab',
  4: 'Bounty',
  5: 'Brawl Ball',
  6: 'Hot Zone',
  7: 'Knockout',
  8: 'Heist',
  9: 'Basket Brawl',
  10: 'wipeout',
  11: 'brawlHockey',
  12: 'duels',
  13: 'brawlArena'
};

export function modeName(id: number): string {
  return MODES[id] ?? `Mode ${id}`;
}
