import { prefixTagURLEncoded } from '../utils/brawl.js';
import { formatBattleLog } from '../utils/formatData.ts';
import type { RawBattleLog, RawPlayerInfo } from '../types/brawlApi.ts';
import type { FormattedBattle } from '../types/battle.ts';

const BRAWL_API_BASE = 'https://api.brawlstars.com/v1/players';

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}` };
}

export interface FetchedBattles {
  // Canonical tag straight from the player-info endpoint (always '#'-prefixed).
  // Used as the query player tag so persisted rows match the format produced by
  // the read path and the battle-log participant tags.
  tag: string;
  battles: FormattedBattle[];
}

// Pulls a player's profile + battle log from the Brawl API and normalizes them
// into FormattedBattle[]. Player info supplies the current-trophies anchor that
// lets formatBattleLog reconstruct per-battle totalTrophies, so both endpoints
// are fetched in parallel. Throws on any non-ok response — callers decide how to
// surface it (HTTP 502 for the route; log-and-continue for the batch writer).
export async function fetchAndFormatBattles(
  playerTag: string,
): Promise<FetchedBattles> {
  const formattedTag = prefixTagURLEncoded(playerTag);
  const [playerRes, battleLogRes] = await Promise.all([
    fetch(`${BRAWL_API_BASE}/${formattedTag}/`, {
      method: 'GET',
      headers: authHeaders(),
    }),
    fetch(`${BRAWL_API_BASE}/${formattedTag}/battlelog`, {
      method: 'GET',
      headers: authHeaders(),
    }),
  ]);

  if (!playerRes.ok) {
    const body = await playerRes.text();
    throw new Error(`player fetch failed ${playerRes.status}: ${body}`);
  }
  if (!battleLogRes.ok) {
    const body = await battleLogRes.text();
    throw new Error(`battlelog fetch failed ${battleLogRes.status}: ${body}`);
  }

  const rawPlayer = (await playerRes.json()) as RawPlayerInfo;
  const rawLog = (await battleLogRes.json()) as RawBattleLog;
  const battles = formatBattleLog(rawLog, rawPlayer.trophies, rawPlayer.tag);
  return { tag: rawPlayer.tag, battles };
}
