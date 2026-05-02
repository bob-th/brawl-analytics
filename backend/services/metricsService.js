import { fetchPlayerBattlesForMetrics } from "./battleRepository.js";

// Mode IDs from brawl-data-service/utils/modeMap.ts. Showdown modes use rank
// instead of victory/defeat — top 4 (solo) / top 2 (duo) are the trophy-gaining
// ranks and count as wins; everything else is a loss. Showdown never produces
// draws.
const SOLO_SHOWDOWN_MODE_ID = 1;
const DUO_SHOWDOWN_MODE_ID = 2;

function classifyOutcome(modeId, result, rank) {
  if (modeId === SOLO_SHOWDOWN_MODE_ID) {
    return rank != null && rank <= 4 ? "wins" : "losses";
  }
  if (modeId === DUO_SHOWDOWN_MODE_ID) {
    return rank != null && rank <= 2 ? "wins" : "losses";
  }
  if (result === "victory") return "wins";
  if (result === "draw") return "draws";
  return "losses";
}

function emptyCell() {
  return { wins: 0, draws: 0, losses: 0 };
}

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
