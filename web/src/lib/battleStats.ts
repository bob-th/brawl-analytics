import type { RecentBattle } from '../types/battle';

export function getTrophyRange(battles: RecentBattle[]): { min: number; max: number } {
  if (battles.length === 0) return { min: 0, max: 0 };
  let min = battles[0].trophies;
  let max = battles[0].trophies;
  for (let i = 1; i < battles.length; i++) {
    const t = battles[i].trophies;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return { min, max };
}

export function getTotalTrophyChange(battles: RecentBattle[]): number {
  return battles[0].trophies - battles[battles.length - 1].trophies;
}
