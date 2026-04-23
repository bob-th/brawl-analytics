import { fetchWithHandling } from "../utils/fetch.js";

// Fetches the full battle log from the data service. Returns the raw DS
// battles array (FormattedBattle[]). Normalization into the canonical shape
// happens in battleService — dataSource stays a thin transport wrapper so the
// raw DS payload (with players[] and mode/map) is still available for writes.
export async function fetchDsBattles(playerTag) {
  const base = process.env.DATA_SERVICE_URL;
  if (!base) throw new Error("DATA_SERVICE_URL is not configured");

  const url = `${base}/player/${encodeURIComponent(playerTag)}/battles`;
  const response = await fetchWithHandling(url);
  return response.battles ?? [];
}
