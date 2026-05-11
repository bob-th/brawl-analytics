import { fetchPlayerBattlesForMetrics } from "./battleRepository.js";
import { classifyOutcome, emptyCell } from "../utils/battleOutcome.js";

export async function getPlayerMetrics(playerTag) {
  const rows = await fetchPlayerBattlesForMetrics(playerTag);

  const overall = emptyCell();
  const modes = {};
  const brawlers = {};

  for (const row of rows) {
    const outcome = classifyOutcome(row.mode_id, row.result, row.rank);
    overall[outcome]++;

    if (row.mode_id == null) {
      // Unknown mode (modeMap.ts didn't recognize it during ingest). Counted
      // toward overall and per-brawler stats but excluded from the per-mode
      // breakdown so we don't surface a misleading "null" key.
      console.warn(
        `metrics: row with null mode_id for player ${playerTag} — modeMap may need updating`
      );
    } else {
      if (!modes[row.mode_id]) modes[row.mode_id] = emptyCell();
      modes[row.mode_id][outcome]++;
    }

    if (row.brawler != null) {
      if (!brawlers[row.brawler]) brawlers[row.brawler] = emptyCell();
      brawlers[row.brawler][outcome]++;
    }
  }

  return { playerTag, overall, modes, brawlers };
}
