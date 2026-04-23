import { registerPlayer } from "../services/userService.js";
import { isValidTag, prefixTag } from "../utils/brawl.js";

// Basic UUID v4 format check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const controller = {
  registerPlayer: async (req, res) => {
    try {
      const { userId } = req.params;
      const { playerTag } = req.body ?? {};

      // --- input validation ---
      if (!userId || !UUID_RE.test(userId)) {
        return res.status(400).json({ error: "Invalid or missing userId (must be UUID)." });
      }
      if (!playerTag || !isValidTag(playerTag)) {
        return res.status(400).json({ error: "Invalid or missing playerTag." });
      }

      const tag = prefixTag(playerTag);
      const result = await registerPlayer(userId, tag);

      return res.status(201).json(result);
    } catch (err) {
      if (err.code === "PLAYER_NOT_FOUND") {
        return res.status(404).json({ error: err.message });
      }
      if (err.code === "DUPLICATE") {
        return res.status(409).json({ error: err.message });
      }

      console.error("registerPlayer failed:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  },
};

export default controller;