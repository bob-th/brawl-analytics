import { fetchRecentBattles } from "./battleRepository.js";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Returns { ok: true, payload } on success; { ok: false, status, error } on
// invalid pagination input. Letting the caller convert a structured rejection
// into an HTTP response keeps the service free of express objects.
export async function getRecentBattles(playerTag, rawLimit, rawOffset) {
  const parsedLimit =
    rawLimit === undefined ? DEFAULT_LIMIT : Number.parseInt(rawLimit, 10);
  const parsedOffset =
    rawOffset === undefined ? 0 : Number.parseInt(rawOffset, 10);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return { ok: false, status: 400, error: "invalid limit" };
  }
  if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
    return { ok: false, status: 400, error: "invalid offset" };
  }

  const limit = Math.min(parsedLimit, MAX_LIMIT);
  const offset = parsedOffset;

  const battles = await fetchRecentBattles(playerTag, limit, offset);
  return {
    ok: true,
    payload: { playerTag, limit, offset, battles },
  };
}
