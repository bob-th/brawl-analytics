import { supabase } from "./database.js";

// Max player tags carried in a single batch (i.e. a single SQS message). The
// data service consumes one message at a time and processes the tags within,
// so this caps the per-message fan-out. 25 keeps each message well under the
// SQS 256 KB body limit while still amortizing per-message overhead.
export const BATCH_SIZE = 25;

// Distinct set of player tags tracked across all users in user_players. Ported
// verbatim from the backend's battleRepository.fetchUniquePlayerTags so the
// coordinator selects exactly the same tag set the cron job did — no
// regression. Supabase-js has no native DISTINCT, so we dedup in memory; the
// row count is bounded by (users × tags/user), which stays small.
export async function fetchUniquePlayerTags() {
  const { data, error } = await supabase
    .from("user_players")
    .select("player_tag");
  if (error) throw error;
  return [...new Set(data.map((r) => r.player_tag))];
}

// Splits a flat tag list into contiguous chunks of at most `size`. Pure and
// synchronous, so it's trivially unit-testable in isolation from Supabase/SQS.
export function batchTags(tags, size = BATCH_SIZE) {
  const batches = [];
  for (let i = 0; i < tags.length; i += size) {
    batches.push(tags.slice(i, i + size));
  }
  return batches;
}

// The coordinator's read step: every tracked tag, grouped into batches of at
// most BATCH_SIZE. Returns a list of lists — one inner list per SQS message the
// AWS layer will publish. Kept free of any AWS/SQS concerns so the data-access
// logic stays independently testable and reusable.
export async function getPlayerTagBatches() {
  const tags = await fetchUniquePlayerTags();
  return batchTags(tags);
}
