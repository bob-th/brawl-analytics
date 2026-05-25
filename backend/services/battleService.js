import { fetchDsBattles } from "./dataSource.js";
import {
  fetchPlayerBattles,
  fetchPlayerBrawlerBattles,
  fetchRecentBattles,
} from "./battleRepository.js";
import { mergeByBattleId, brawlTimeToIso } from "../utils/mergeBattles.js";
import { computeIntervals } from "../utils/battleOutcome.js";

// Team modes carry a string result; showdown carries a numeric rank. The client
// gets a single `result` field — whichever was populated.
function unifyResult(row) {
  return row.result ?? row.rank ?? null;
}

// DS battle -> canonical shape used for endpoint 1 merge/format.
function dsToCanonicalFullLog(b) {
  return {
    battleId: b.battleId,
    battleTime: brawlTimeToIso(b.battleTime),
    result: b.result,
    rank: b.rank,
    trophyChange: b.trophyChange,
    trophies: b.totalTrophies,
  };
}

// DS battle -> canonical shape used for endpoint 2 merge/format. Filters to
// battles where the query player used the target brawler. Mirrors the rich
// shape of dsToCanonicalRecentBattle so mergeByBattleId can union cleanly
// with the DB rows from the brawler-filtered detailed_battle_log query.
function dsToCanonicalBrawlerLog(b, queryPlayerTag, brawlerId) {
  const me = b.players?.find(
    (p) => p.playerTag === queryPlayerTag && p.brawlerId === brawlerId
  );
  if (!me) return null;
  return {
    battleId: b.battleId,
    battleTime: brawlTimeToIso(b.battleTime),
    modeId: b.modeId,
    map: b.map,
    brawler: me.brawlerId,
    brawlerTrophies: me.trophies,
    trophies: b.totalTrophies,
    trophyChange: b.trophyChange,
    result: b.result,
    rank: b.rank,
  };
}

// DS battle -> canonical shape used for the recent-battles merge/format.
// Mirrors the column set returned by battleRepository.fetchRecentBattles so
// mergeByBattleId can union the two cleanly. The query player's brawler and
// per-brawler trophies are looked up from players[] by tag.
function dsToCanonicalRecentBattle(b, queryPlayerTag) {
  const me = b.players?.find((p) => p.playerTag === queryPlayerTag);
  if (!me) return null;
  return {
    battleId: b.battleId,
    battleTime: brawlTimeToIso(b.battleTime),
    modeId: b.modeId,
    map: b.map,
    brawler: me.brawlerId,
    brawlerTrophies: me.trophies,
    trophies: b.totalTrophies,
    trophyChange: b.trophyChange,
    result: b.result,
    rank: b.rank,
  };
}

// Canonical row -> recent-battles response row. Drops battleId (an internal
// merge key) and collapses result/rank into the single unified `result` field.
function formatRecentBattle(r) {
  return {
    battleTime: r.battleTime,
    modeId: r.modeId,
    map: r.map,
    brawler: r.brawler,
    brawlerTrophies: r.brawlerTrophies,
    trophies: r.trophies,
    trophyChange: r.trophyChange,
    result: unifyResult(r),
  };
}

function logSourceFailures(label, dsResult, dbResult) {
  if (dsResult.status === "rejected") {
    console.warn(`${label}: DS fetch failed:`, dsResult.reason?.message ?? dsResult.reason);
  }
  if (dbResult.status === "rejected") {
    console.warn(`${label}: DB fetch failed:`, dbResult.reason?.message ?? dbResult.reason);
  }
}

export async function getPlayerBattles(playerTag) {
  const [dsR, dbR] = await Promise.allSettled([
    fetchDsBattles(playerTag),
    fetchPlayerBattles(playerTag),
  ]);
  logSourceFailures("getPlayerBattles", dsR, dbR);

  if (dsR.status === "rejected" && dbR.status === "rejected") {
    throw new Error("both sources failed");
  }

  const rawDsBattles = dsR.status === "fulfilled" ? dsR.value : [];
  const dbRows = dbR.status === "fulfilled" ? dbR.value : [];
  const dsCanonical = rawDsBattles.map(dsToCanonicalFullLog);

  const { merged } = mergeByBattleId(dbRows, dsCanonical);

  const payload = {
    playerTag,
    battles: merged.map((r) => ({
      battleTime: r.battleTime,
      trophies: r.trophies,
      result: unifyResult(r),
      trophyChange: r.trophyChange,
    })),
  };

  return payload;
}

// DS only ever returns the ~25 newest battles, so unifying with DS is only
// useful for the first page. For deeper pages we skip the DS round-trip and
// serve straight from the DB. The over-fetch on page 1 covers the worst case
// where every DS battle was already in DB — we still want `limit` rows after
// dedup.
const RECENT_BATTLES_DS_OVERLAP = 25;

export async function getRecentBattles(playerTag, limit, offset) {
  if (offset > 0) {
    const dbRows = await fetchRecentBattles(playerTag, limit, offset);
    const sliced = dbRows.slice(0, limit);
    return {
      playerTag,
      limit,
      offset,
      battles: sliced.map(formatRecentBattle),
      intervals: computeIntervals(sliced),
    };
  }

  const [dsR, dbR] = await Promise.allSettled([
    fetchDsBattles(playerTag),
    fetchRecentBattles(playerTag, limit + RECENT_BATTLES_DS_OVERLAP, 0),
  ]);
  logSourceFailures("getRecentBattles", dsR, dbR);

  if (dsR.status === "rejected" && dbR.status === "rejected") {
    throw new Error("both sources failed");
  }

  const rawDsBattles = dsR.status === "fulfilled" ? dsR.value : [];
  const dbRows = dbR.status === "fulfilled" ? dbR.value : [];
  const dsCanonical = rawDsBattles
    .map((b) => dsToCanonicalRecentBattle(b, playerTag))
    .filter(Boolean);

  const { merged } = mergeByBattleId(dbRows, dsCanonical);
  const sliced = merged.slice(0, limit);

  const payload = {
    playerTag,
    limit,
    offset,
    battles: sliced.map(formatRecentBattle),
    intervals: computeIntervals(sliced),
  };

  return payload;
}

// Same DS-overlap pattern as getRecentBattles: page 0 unifies DS with DB and
// over-fetches from DB so we still produce `limit` rows after dedup; deeper
// pages skip the DS round-trip and serve straight from DB.
const BRAWLER_BATTLES_DS_OVERLAP = 25;

export async function getPlayerBrawlerBattles(playerTag, brawlerId, limit, offset) {
  if (offset > 0) {
    const dbRows = await fetchPlayerBrawlerBattles(playerTag, brawlerId, limit, offset);
    const sliced = dbRows.slice(0, limit);
    return {
      playerTag,
      brawler: brawlerId,
      limit,
      offset,
      battles: sliced.map(formatRecentBattle),
      intervals: computeIntervals(sliced),
    };
  }

  const [dsR, dbR] = await Promise.allSettled([
    fetchDsBattles(playerTag),
    fetchPlayerBrawlerBattles(playerTag, brawlerId, limit + BRAWLER_BATTLES_DS_OVERLAP, 0),
  ]);
  logSourceFailures("getPlayerBrawlerBattles", dsR, dbR);

  if (dsR.status === "rejected" && dbR.status === "rejected") {
    throw new Error("both sources failed");
  }

  const rawDsBattles = dsR.status === "fulfilled" ? dsR.value : [];
  const dbRows = dbR.status === "fulfilled" ? dbR.value : [];

  const dsCanonical = rawDsBattles
    .map((b) => dsToCanonicalBrawlerLog(b, playerTag, brawlerId))
    .filter(Boolean);

  const { merged } = mergeByBattleId(dbRows, dsCanonical);
  const sliced = merged.slice(0, limit);

  const payload = {
    playerTag,
    brawler: brawlerId,
    limit,
    offset,
    battles: sliced.map(formatRecentBattle),
    intervals: computeIntervals(sliced),
  };

  return payload;
}
