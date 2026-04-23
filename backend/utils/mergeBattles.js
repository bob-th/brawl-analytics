// Converts the Brawl API battle time format ("20260420T222509.000Z") to
// ISO 8601 ("2026-04-20T22:25:09.000Z") so DS and DB rows sort/compare cleanly.
export function brawlTimeToIso(brawlTime) {
  if (!brawlTime || brawlTime.includes("-")) return brawlTime;
  const y = brawlTime.substr(0, 4);
  const mo = brawlTime.substr(4, 2);
  const d = brawlTime.substr(6, 2);
  const h = brawlTime.substr(9, 2);
  const mi = brawlTime.substr(11, 2);
  const s = brawlTime.substr(13, 2);
  const ms = brawlTime.substr(16, 3);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}Z`;
}

// Given two canonical-shaped arrays keyed by battleId, return the union sorted
// by battleTime desc plus the subset that came only from DS (for async writes).
// DB wins on collision: any battleId already in DB is dropped from the DS side.
export function mergeByBattleId(dbRows, dsRows) {
  const dbIds = new Set(dbRows.map((r) => r.battleId));
  const newFromDs = dsRows.filter((r) => !dbIds.has(r.battleId));
  const newFromDs_sorted = newFromDs.sort((a, b) =>
    a.battleTime < b.battleTime ? 1 : a.battleTime > b.battleTime ? -1 : 0
  );
  const merged = [...dbRows, ...newFromDs_sorted]
  return { merged, newFromDs_sorted };
}
