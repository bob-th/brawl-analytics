import { fetchWithHandling } from "../utils/fetch.js";
import { supabase } from "../database.js";
//to be appended to data service url in .env, my personal account
const TEST_PLAYER_TAG = "%232JCJG00"
const controller = {
  getPlayerData: async (req, res) => {
    try {
      const { playerTag } = req.params;
      if (!playerTag) {
        return res.status(400).json({ error: "must provide player tag" });
      }

      const playerData = await fetchWithHandling(
        `${process.env.DATA_SERVICE_URL}/player/${playerTag}/`
      );
      const playerLog = await fetchWithHandling(
        `${process.env.DATA_SERVICE_URL}/player/${playerTag}/battles`
      );

      res.json({ playerData, playerLog });
    } catch (err) {
      console.error("getPlayerData failed:", err);
      return res.status(500).json({ error: "failed to fetch player data" });
    }
  },

  getBattleData: async (req, res) => {
    try {
      const { playerTag } = req.params;
      if (!playerTag) {
        return res.status(400).json({ error: "must provide player tag" });
      }

      const { data, error } = await supabase
        .from("battle_log")
        .select(`
          battle_id,
          battle_time,
          result,
          rank,
          trophy_change,
          battle_info!inner ( mode_id, map )
        `)
        .eq("player_tag", playerTag)
        .order("battle_time", { ascending: false });

      if (error) {
        console.error("battle_log query error:", error);
        return res.status(500).json({ error: "database error" });
      }

      res.json({ battleLog: data });
    } catch (err) {
      console.error("getBattleData failed:", err);
      return res.status(500).json({ error: "general error" });
    }
  },
};

export default controller;
