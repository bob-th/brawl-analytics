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

// Returns canonical-shaped rows for endpoint 1 (full battle log).
// battle_log and trophies_store share only a transitive FK via battle_info, so
// we fire two queries in parallel and zip client-side on battle_time (PK on both).
export async function fetchPlayerBattles(playerTag) {
  const [logsRes, trophiesRes] = await Promise.all([
    supabase
      .from("battle_log")
      .select("battle_id, battle_time, result, rank, trophy_change")
      .eq("player_tag", playerTag)
      .order("battle_time", { ascending: false }),
    supabase
      .from("trophies_store")
      .select("battle_time, trophies")
      .eq("player_tag", playerTag),
  ]);

  if (logsRes.error) throw logsRes.error;
  if (trophiesRes.error) throw trophiesRes.error;

  const trophiesByTime = new Map(
    trophiesRes.data.map((r) => [r.battle_time, r.trophies])
  );

  return logsRes.data.map((r) => ({
    battleId: r.battle_id,
    battleTime: r.battle_time,
    result: r.result,
    rank: r.rank,
    trophyChange: r.trophy_change,
    trophies: trophiesByTime.get(r.battle_time) ?? null,
  }));
}

// Returns canonical-shaped rows for endpoint 2 (per-brawler battle log).
// Client-side inner-join on battle_time filters naturally to battles where the
// player used this brawler.
export async function fetchPlayerBrawlerBattles(playerTag, brawlerId) {
  const [logsRes, brawlerRes] = await Promise.all([
    supabase
      .from("battle_log")
      .select("battle_id, battle_time, result, rank, trophy_change")
      .eq("player_tag", playerTag)
      .order("battle_time", { ascending: false }),
    supabase
      .from("brawler_trophies_store")
      .select("battle_time, brawler_trophies")
      .eq("player_tag", playerTag)
      .eq("brawler", brawlerId),
  ]);

  if (logsRes.error) throw logsRes.error;
  if (brawlerRes.error) throw brawlerRes.error;

  const brawlerTrophiesByTime = new Map(
    brawlerRes.data.map((r) => [r.battle_time, r.brawler_trophies])
  );

  return logsRes.data
    .filter((r) => brawlerTrophiesByTime.has(r.battle_time))
    .map((r) => ({
      battleId: r.battle_id,
      battleTime: r.battle_time,
      result: r.result,
      rank: r.rank,
      trophyChange: r.trophy_change,
      brawlerTrophies: brawlerTrophiesByTime.get(r.battle_time),
    }));
}
