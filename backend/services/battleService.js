import { fetchDsBattles } from "./dataSource.js";
import {
  fetchPlayerBattles,
  fetchPlayerBrawlerBattles,
} from "./battleRepository.js";
import { mergeByBattleId, brawlTimeToIso } from "../utils/mergeBattles.js";

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
// battles where the query player used the target brawler and pulls that
// player's per-brawler trophies from the players[] entry.
function dsToCanonicalBrawlerLog(b, queryPlayerTag, brawlerId) {
  const me = b.players?.find(
    (p) => p.playerTag === queryPlayerTag && p.brawlerId === brawlerId
  );
  if (!me) return null;
  return {
    battleId: b.battleId,
    battleTime: brawlTimeToIso(b.battleTime),
    result: b.result,
    rank: b.rank,
    trophyChange: b.trophyChange,
    brawlerTrophies: me.trophies,
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

  const { merged, newFromDs } = mergeByBattleId(dbRows, dsCanonical);

  const payload = {
    playerTag,
    battles: merged.map((r) => ({
      battleTime: r.battleTime,
      trophies: r.trophies,
      result: unifyResult(r),
      trophyChange: r.trophyChange,
    })),
  };

  // Only persist when both sources succeeded — avoids re-upserting the world
  // during a sustained DB outage.
  const bothSucceeded =
    dsR.status === "fulfilled" && dbR.status === "fulfilled";
  const newDsBattleIds = new Set(newFromDs.map((r) => r.battleId));
  const dsBattlesForWrite =
    bothSucceeded && newFromDs.length > 0
      ? rawDsBattles.filter((b) => newDsBattleIds.has(b.battleId))
      : null;

  return { payload, dsBattlesForWrite };
}

export async function getPlayerBrawlerBattles(playerTag, brawlerId) {
  const [dsR, dbR] = await Promise.allSettled([
    fetchDsBattles(playerTag),
    fetchPlayerBrawlerBattles(playerTag, brawlerId),
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

  const payload = {
    playerTag,
    brawler: brawlerId,
    battles: merged.map((r) => ({
      battleTime: r.battleTime,
      brawlerTrophies: r.brawlerTrophies,
      trophyChange: r.trophyChange,
      result: unifyResult(r),
    })),
  };

  // Endpoint 2's DB query is brawler-filtered, so we can't cheaply compute
  // which DS battles are truly new. Hand the writer the full raw set and let
  // ON CONFLICT DO NOTHING handle dedup at the DB layer.
  const bothSucceeded =
    dsR.status === "fulfilled" && dbR.status === "fulfilled";
  const dsBattlesForWrite =
    bothSucceeded && rawDsBattles.length > 0 ? rawDsBattles : null;

  return { payload, dsBattlesForWrite };
}
