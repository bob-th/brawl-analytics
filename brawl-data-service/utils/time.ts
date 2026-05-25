// Converts the Brawl API battle time format ("20260420T222509.000Z") to
// ISO 8601 ("2026-04-20T22:25:09.000Z") so DB rows sort/compare cleanly.
// Ported from backend/utils/mergeBattles.js — the only piece the writer needs.
export function brawlTimeToIso(brawlTime: string): string {
  if (!brawlTime || brawlTime.includes('-')) return brawlTime;
  const y = brawlTime.substr(0, 4);
  const mo = brawlTime.substr(4, 2);
  const d = brawlTime.substr(6, 2);
  const h = brawlTime.substr(9, 2);
  const mi = brawlTime.substr(11, 2);
  const s = brawlTime.substr(13, 2);
  const ms = brawlTime.substr(16, 3);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}Z`;
}
