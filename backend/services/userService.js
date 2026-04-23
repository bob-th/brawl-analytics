import { supabase } from "../database.js";
import { fetchWithHandling } from "../utils/fetch.js";

/**
 * Validates that a player tag exists by calling the data service's player
 * endpoint. Throws if the tag is not found or the service is unreachable.
 */
async function verifyPlayerTagExists(playerTag) {
  const base = process.env.DATA_SERVICE_URL;
  if (!base) throw new Error("DATA_SERVICE_URL is not configured");

  const url = `${base}/player/${encodeURIComponent(playerTag)}/`;
  // fetchWithHandling throws on non-2xx, so a successful return means the
  // player exists on the Brawl Stars API.
  await fetchWithHandling(url);
}

/**
 * Registers a player tag to a user. Verifies the tag is real via the data
 * service before writing to `user_players`.
 *
 * @param {string} userId  – Supabase Auth user UUID
 * @param {string} playerTag – Brawl Stars player tag (e.g. "#2JCJG00")
 * @returns {Promise<{userId: string, playerTag: string}>} the created association
 * @throws {Error} with `.code` when the tag is invalid or already registered
 */
export async function registerPlayer(userId, playerTag) {
  // 1. Verify the tag actually exists on the Brawl Stars API
  try {
    await verifyPlayerTagExists(playerTag);
  } catch (err) {
    const error = new Error(`Player tag "${playerTag}" could not be verified: ${err.message}`);
    error.code = "PLAYER_NOT_FOUND";
    throw error;
  }

  // 2. Insert into user_players
  const { data, error } = await supabase
    .from("user_players")
    .insert({ user_id: userId, player_tag: playerTag })
    .select("user_id, player_tag, created_at")
    .single();

  if (error) {
    // Unique-constraint violation (PK on user_id + player_tag)
    if (error.code === "23505") {
      const conflict = new Error(
        `Player "${playerTag}" is already registered to user "${userId}".`
      );
      conflict.code = "DUPLICATE";
      throw conflict;
    }
    throw error;
  }

  return { userId: data.user_id, playerTag: data.player_tag, createdAt: data.created_at };
}
