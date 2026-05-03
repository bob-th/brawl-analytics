import type {
  PlayerDataResponse,
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
  const body: PlayerDataResponse = await res.json();
  return body.playerData;
}
