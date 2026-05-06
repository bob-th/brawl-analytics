import type {
  PlayerBattlesResponse,
  PlayerBrawlerBattlesResponse,
  PlayerMetrics,
  PlayerProfile,
  RecentBattlesResponse,
} from '../types/battle';

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

function withHash(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

export async function getRecentBattles(
  playerTag: string,
  limit = 25,
  offset = 0
): Promise<RecentBattlesResponse> {
  const tag = encodeURIComponent(withHash(playerTag));
  const url = `${BASE_URL}/api/players/${tag}/recent-battles?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`recent-battles ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

export async function getPlayerProfile(playerTag: string): Promise<PlayerProfile> {
  const tag = encodeURIComponent(withHash(playerTag));
  const url = `${BASE_URL}/api/players/${tag}/`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`player profile ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function getPlayerMetrics(
  playerTag: string,
  limit?: number
): Promise<PlayerMetrics> {
  const tag = encodeURIComponent(withHash(playerTag));
  const qs = limit != null ? `?limit=${limit}` : '';
  const url = `${BASE_URL}/api/players/${tag}/metrics${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`metrics ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function getPlayerBattles(playerTag: string): Promise<PlayerBattlesResponse> {
  const tag = encodeURIComponent(withHash(playerTag));
  const url = `${BASE_URL}/api/players/${tag}/battles`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`battles ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function getPlayerBrawlerBattles(
  playerTag: string,
  brawlerId: number,
  limit = 50,
  offset = 0
): Promise<PlayerBrawlerBattlesResponse> {
  const tag = encodeURIComponent(withHash(playerTag));
  const url = `${BASE_URL}/api/players/${tag}/brawlers/${brawlerId}/battles?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`brawler-battles ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
