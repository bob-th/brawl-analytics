import { supabase } from "../database.js";

// Returns the distinct set of player tags tracked across all users in
// user_players. Supabase-js has no native DISTINCT, so we dedup in memory —
// the row count is bounded by (users × tags/user), which stays small.
export async function fetchUniquePlayerTags() {
  const { data, error } = await supabase
    .from("user_players")
    .select("player_tag");
  if (error) throw error;
  return [...new Set(data.map((r) => r.player_tag))];
}

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

// Endpoint 2: per-brawler battle log. Reads from the `brawler_battle_log`
// view, which inner-joins battle_log and brawler_trophies_store on
// (player_tag, battle_time). Filtering by brawler at the DB level naturally
// restricts results to battles where the player used that brawler.
export async function fetchPlayerBrawlerBattles(playerTag, brawlerId) {
  const { data, error } = await supabase
    .from("brawler_battle_log")
    .select(
      "battle_id, battle_time, result, rank, trophy_change, brawler_trophies"
    )
    .eq("player_tag", playerTag)
    .eq("brawler", brawlerId)
    .order("battle_time", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    battleId: r.battle_id,
    battleTime: r.battle_time,
    result: r.result,
    rank: r.rank,
    trophyChange: r.trophy_change,
    brawlerTrophies: r.brawler_trophies,
  }));
}
