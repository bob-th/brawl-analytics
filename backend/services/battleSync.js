import pLimit from "p-limit";
import { fetchDsBattles } from "./dataSource.js";
import { fetchUniquePlayerTags } from "./battleRepository.js";
import { persistNewBattles } from "./battleWriter.js";
// FOR REGULARLY UPDATING DATABSE WITH BRAWLSTARS API USING DATA SERVICE

// Bounded fan-out. Each per-tag task is mostly network I/O (one DS HTTP call
// + three Supabase upserts) and independent of other tags, so concurrent
// execution drops wall time from O(tags) to roughly O(tags / concurrency).
// Capped to keep us under the Brawl Stars per-key rate limit and to avoid
// flooding the data-service / Supabase connection pool. Tunable in prod via
// env without a code change.
const SYNC_CONCURRENCY = Number(process.env.SYNC_CONCURRENCY) || 30;

// Pulls fresh battles for one tag from the DS and upserts them. Writes rely on
// ON CONFLICT DO NOTHING so it's safe to call repeatedly — existing rows are
// skipped at the DB layer.
async function syncPlayerBattles(playerTag) {
  const battles = await fetchDsBattles(playerTag);
  if (battles.length === 0) return 0;
  await persistNewBattles(playerTag, battles);
  return battles.length;
}

// Iterates every unique tracked player tag and refreshes their battles.
// Errors on one tag are logged and don't halt the rest — Promise.allSettled
// gives that isolation natively, no per-task try/catch needed.
export async function syncAllPlayers() {
  const startedAt = Date.now();
  let tags;
  try {
    tags = await fetchUniquePlayerTags();
  } catch (err) {
    console.error("syncAllPlayers: fetchUniquePlayerTags failed:", err);
    return;
  }
  const fetchDoneAt = Date.now();
  const ms_fetch = fetchDoneAt - startedAt;

  console.log(
    `syncAllPlayers: starting for ${tags.length} tags (concurrency=${SYNC_CONCURRENCY})`
  );

  const limit = pLimit(SYNC_CONCURRENCY);
  const results = await Promise.allSettled(
    tags.map((tag) => limit(() => syncPlayerBattles(tag)))
  );

  let ok = 0;
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      ok += 1;
    } else {
      failed += 1;
      console.error(
        `syncAllPlayers: ${tags[i]} failed:`,
        r.reason?.message ?? r.reason
      );
    }
  });

  const ms_sync = Date.now() - fetchDoneAt;
  console.log(
    `syncAllPlayers: done fetch tags ${ms_fetch}ms, sync in ${ms_sync}ms — ok=${ok} failed=${failed}`
  );
}
