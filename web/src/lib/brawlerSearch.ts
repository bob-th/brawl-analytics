import type { PlayerMetrics } from '../types/battle';
import { BRAWLERS, brawlerName } from '../data/brawlers';

export interface BrawlerSuggestion {
  id: number;
  name: string;
  games: number;
}

function buildPlayedList(metrics: PlayerMetrics): BrawlerSuggestion[] {
  return Object.entries(metrics.brawlers).map(([id, cell]) => ({
    id: Number(id),
    name: brawlerName(Number(id)),
    games: cell.wins + cell.draws + cell.losses,
  }));
}

function gamesByIdMap(metrics: PlayerMetrics): Map<number, number> {
  return new Map(
    Object.entries(metrics.brawlers).map(([id, cell]) => [
      Number(id),
      cell.wins + cell.draws + cell.losses,
    ])
  );
}

export function topBrawlersByGames(metrics: PlayerMetrics, n = 5): BrawlerSuggestion[] {
  return buildPlayedList(metrics)
    .sort((a, b) => b.games - a.games)
    .slice(0, n);
}

export function searchAllBrawlers(
  metrics: PlayerMetrics,
  query: string
): BrawlerSuggestion[] {
  const q = query.trim().toLowerCase();
  const played = gamesByIdMap(metrics);
  const all: BrawlerSuggestion[] = Object.entries(BRAWLERS).map(([id, name]) => ({
    id: Number(id),
    name,
    games: played.get(Number(id)) ?? 0,
  }));
  const filtered =
    q.length === 0 ? all : all.filter((b) => b.name.toLowerCase().includes(q));
  return filtered.sort((a, b) => {
    if (a.games !== b.games) return b.games - a.games;
    return a.name.localeCompare(b.name);
  });
}
