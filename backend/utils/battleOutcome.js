// Mode IDs from brawl-data-service/utils/modeMap.ts. Showdown modes use rank
// instead of victory/defeat — top 4 (solo) / top 2 (duo) are the trophy-gaining
// ranks and count as wins; everything else is a loss. Showdown never produces
// draws.
export const SOLO_SHOWDOWN_MODE_ID = 1;
export const DUO_SHOWDOWN_MODE_ID = 2;

export function classifyOutcome(modeId, result, rank) {
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

export function emptyCell() {
  return { wins: 0, draws: 0, losses: 0 };
}

// Buckets a list of canonical battle rows into fixed-size intervals and
// classifies each into wins/draws/losses. Rows must still carry separate
// `result` (string) and `rank` (number) fields — i.e. pre-formatRecentBattle —
// so classifyOutcome's signature works without a unified-field dispatch.
//
// `intervals[i]` covers rows[i*intervalSize : (i+1)*intervalSize]. The last
// interval may be partial. Returns [] for empty input.
export function computeIntervals(rows, intervalSize = 25) {
  const intervals = [];
  for (let i = 0; i < rows.length; i += intervalSize) {
    const cell = emptyCell();
    const end = Math.min(i + intervalSize, rows.length);
    for (let j = i; j < end; j++) {
      const row = rows[j];
      cell[classifyOutcome(row.modeId, row.result, row.rank)]++;
    }
    intervals.push(cell);
  }
  return intervals;
}
