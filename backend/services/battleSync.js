import { fetchDsBattles } from "./dataSource.js";
import { fetchUniquePlayerTags } from "./battleRepository.js";
import { persistNewBattles } from "./battleWriter.js";
// FOR REGULARLY UPDATING DATABSE WITH BRAWLSTARS API USING DATA SERVICE

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
// Errors on one tag are logged and don't halt the rest.
export async function syncAllPlayers() {
  const startedAt = Date.now();
  let tags;
  try {
    tags = await fetchUniquePlayerTags();
  } catch (err) {
    console.error("syncAllPlayers: fetchUniquePlayerTags failed:", err);
    return;
  }
  const ms_fetch = Date.now() - startedAt;

  console.log(`syncAllPlayers: starting for ${tags.length} tags`);
  let ok = 0;
  let failed = 0;
  for (const tag of tags) {
    try {
      await syncPlayerBattles(tag);
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`syncAllPlayers: ${tag} failed:`, err?.message ?? err);
    }
  }
  const ms_sync = Date.now() - startedAt;
  console.log(
    `syncAllPlayers: done fetch tags ${ms_fetch}ms, sync in ${ms_sync}ms — ok=${ok} failed=${failed}`
  );
}
