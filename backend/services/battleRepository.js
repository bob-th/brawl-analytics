import { supabase } from "../database.js";

// Endpoint 1: full battle log. `trophies` is now a column on battle_log itself
// (see migration 20260423000000_collapse_trophies_store), so a single query
// covers everything we need — no client-side zip.
export async function fetchPlayerBattles(playerTag) {
  const { data, error } = await supabase
    .from("battle_log")
    .select("battle_id, battle_time, result, rank, trophy_change, trophies")
    .eq("player_tag", playerTag)
    .order("battle_time", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    battleId: r.battle_id,
    battleTime: r.battle_time,
    result: r.result,
    rank: r.rank,
    trophyChange: r.trophy_change,
    trophies: r.trophies,
  }));
}

// Endpoint 2: per-brawler battle log. Reads from `detailed_battle_log` (the
// same view backing fetchRecentBattles), filtered to the player's battles
// with the target brawler. Returns the same rich row shape as
// fetchRecentBattles so the brawler chart can reuse the recent-battles UI.
export async function fetchPlayerBrawlerBattles(playerTag, brawlerId, limit, offset) {
  let query = supabase
    .from("detailed_battle_log")
    .select(
      "battle_id, battle_time, mode_id, map, brawler, brawler_trophies, trophies, trophy_change, result, rank"
    )
    .eq("player_tag", playerTag)
    .eq("brawler", brawlerId)
    .order("battle_time", { ascending: false });
  if (limit != null) {
    const from = offset ?? 0;
    const to = from + limit - 1;
    query = query.range(from, to);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data.map((r) => ({
    battleId: r.battle_id,
    battleTime: r.battle_time,
    modeId: r.mode_id,
    map: r.map,
    brawler: r.brawler,
    brawlerTrophies: r.brawler_trophies,
    trophies: r.trophies,
    trophyChange: r.trophy_change,
    result: r.result,
    rank: r.rank,
  }));
}

// Metrics endpoint: minimal projection — only the fields needed to bucket
// each battle into wins/draws/losses by mode and by brawler. Reads from
// detailed_battle_log (battle_log + brawler_trophies_store + battle_info)
// because we need mode_id; brawler_battle_log doesn't carry it on purpose.
// Scans the player's full history; recent-window W/L lives elsewhere.
export async function fetchPlayerBattlesForMetrics(playerTag) {
  const { data, error } = await supabase
    .from("detailed_battle_log")
    .select("result, rank, brawler, mode_id")
    .eq("player_tag", playerTag)
    .order("battle_time", { ascending: false });
  if (error) throw error;
  return data;
}

// Recent-battles endpoint: full row projection ordered newest-first, paginated
// via supabase-js .range(from, to) which maps to PostgREST's Range header.
// Uses detailed_battle_log so mode_id and map come back in the same query.
// battle_id is included so the row can participate in mergeByBattleId when the
// caller unifies this with the data-service response.
export async function fetchRecentBattles(playerTag, limit, offset) {
  const from = offset;
  const to = offset + limit - 1;
  const { data, error } = await supabase
    .from("detailed_battle_log")
    .select(
      "battle_id, battle_time, mode_id, map, brawler, brawler_trophies, trophies, trophy_change, result, rank"
    )
    .eq("player_tag", playerTag)
    .order("battle_time", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data.map((r) => ({
    battleId: r.battle_id,
    battleTime: r.battle_time,
    modeId: r.mode_id,
    map: r.map,
    brawler: r.brawler,
    brawlerTrophies: r.brawler_trophies,
    trophies: r.trophies,
    trophyChange: r.trophy_change,
    result: r.result,
    rank: r.rank,
  }));
}
