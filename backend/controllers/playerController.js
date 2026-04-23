import { fetchWithHandling } from "../utils/fetch.js";
import { supabase } from "../database.js";
import {
  getPlayerBattles,
  getPlayerBrawlerBattles,
} from "../services/battleService.js";
import { persistNewBattles } from "../services/battleWriter.js";
//to be appended to data service url in .env, my personal account
const TEST_PLAYER_TAG = "%232JCJG00"
const controller = {
  getPlayerBattlesUnified: async (req, res) => {
    try {
      const { playerTag } = req.params;
      if (!playerTag) {
        return res.status(400).json({ error: "must provide player tag" });
      }

      const { payload, dsBattlesForWrite } = await getPlayerBattles(playerTag);
      res.json(payload);

      if (dsBattlesForWrite) {
        setImmediate(() =>
          persistNewBattles(playerTag, dsBattlesForWrite).catch((err) =>
            console.error("async persist failed:", err)
          )
        );
      }
    } catch (err) {
      console.error("getPlayerBattlesUnified failed:", err);
      return res.status(502).json({ error: "failed to fetch battles" });
    }
  },

  getPlayerBrawlerBattles: async (req, res) => {
    try {
      const { playerTag } = req.params;
      const brawlerId = Number.parseInt(req.params.brawlerId, 10);
      if (!playerTag) {
        return res.status(400).json({ error: "must provide player tag" });
      }
      if (!Number.isFinite(brawlerId)) {
        return res.status(400).json({ error: "invalid brawlerId" });
      }

      const { payload, dsBattlesForWrite } = await getPlayerBrawlerBattles(
        playerTag,
        brawlerId
      );
      res.json(payload);

      if (dsBattlesForWrite) {
        setImmediate(() =>
          persistNewBattles(playerTag, dsBattlesForWrite).catch((err) =>
            console.error("async persist failed:", err)
          )
        );
      }
    } catch (err) {
      console.error("getPlayerBrawlerBattles failed:", err);
      return res.status(502).json({ error: "failed to fetch brawler battles" });
    }
  },

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
