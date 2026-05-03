import { fetchWithHandling } from "../utils/fetch.js";
import { supabase } from "../database.js";
import {
  getPlayerBattles,
  getPlayerBrawlerBattles,
  getRecentBattles,
} from "../services/battleService.js";
import { persistNewBattles } from "../services/battleWriter.js";
import { getPlayerMetrics } from "../services/metricsService.js";
import { isValidTag, normalizeTag } from "../utils/brawl.js";

const RECENT_BATTLES_DEFAULT_LIMIT = 25;
const RECENT_BATTLES_MAX_LIMIT = 100;
const controller = {
  getPlayerBattlesUnified: async (req, res) => {
    try {
      //normalizes all player tag prefixes to #
      const playerTag = normalizeTag(req.params.playerTag);
      if (!isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
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
      const playerTag = normalizeTag(req.params.playerTag);
      const brawlerId = Number.parseInt(req.params.brawlerId, 10);
      if (!isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
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
      const playerTag = normalizeTag(req.params.playerTag);
      if (!isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
      }

      const playerData = await fetchWithHandling(
        `${process.env.DATA_SERVICE_URL}/player/${encodeURIComponent(playerTag)}/`
      );
      

      res.json(playerData);
    } catch (err) {
      console.error("getPlayerData failed:", err);
      return res.status(500).json({ error: "failed to fetch player data" });
    }
  },

  getPlayerMetrics: async (req, res) => {
    try {
      const playerTag = normalizeTag(req.params.playerTag);
      if (!isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
      }

      const payload = await getPlayerMetrics(playerTag);
      res.json(payload);
    } catch (err) {
      console.error("getPlayerMetrics failed:", err);
      return res.status(500).json({ error: "failed to compute metrics" });
    }
  },

  getRecentBattles: async (req, res) => {
    try {
      const playerTag = normalizeTag(req.params.playerTag);
      if (!isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
      }

      const parsedLimit =
        req.query.limit === undefined
          ? RECENT_BATTLES_DEFAULT_LIMIT
          : Number.parseInt(req.query.limit, 10);
      const parsedOffset =
        req.query.offset === undefined
          ? 0
          : Number.parseInt(req.query.offset, 10);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ error: "invalid limit" });
      }
      if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({ error: "invalid offset" });
      }
      const limit = Math.min(parsedLimit, RECENT_BATTLES_MAX_LIMIT);
      const offset = parsedOffset;

      const { payload, dsBattlesForWrite } = await getRecentBattles(
        playerTag,
        limit,
        offset
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
      console.error("getRecentBattles failed:", err);
      return res.status(502).json({ error: "failed to fetch recent battles" });
    }
  },

  getBattleData: async (req, res) => {
    try {
      const playerTag = normalizeTag(req.params.playerTag);
      if (!isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
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
