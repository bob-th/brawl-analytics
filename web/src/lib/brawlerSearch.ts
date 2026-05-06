import type { PlayerMetrics } from '../types/battle';
import { brawlerName } from '../data/brawlers';

export interface BrawlerSuggestion {
  id: number;
  name: string;
  games: number;
}

function buildList(metrics: PlayerMetrics): BrawlerSuggestion[] {
  return Object.entries(metrics.brawlers).map(([id, cell]) => ({
    id: Number(id),
    name: brawlerName(Number(id)),
    games: cell.wins + cell.draws + cell.losses,
  }));
}

export function topBrawlersByGames(metrics: PlayerMetrics, n = 5): BrawlerSuggestion[] {
  return buildList(metrics)
    .sort((a, b) => b.games - a.games)
    .slice(0, n);
}

export function searchPlayedBrawlers(
  metrics: PlayerMetrics,
  query: string
): BrawlerSuggestion[] {
  const q = query.trim().toLowerCase();
  const list = buildList(metrics);
  if (q.length === 0) return list.sort((a, b) => b.games - a.games);
  return list
    .filter((b) => b.name.toLowerCase().includes(q))
    .sort((a, b) => b.games - a.games);
}
