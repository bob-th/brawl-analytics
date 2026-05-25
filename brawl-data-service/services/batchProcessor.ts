import pLimit from 'p-limit';
import { fetchAndFormatBattles } from './brawlClient.ts';
import { persistNewBattles } from './battleWriter.ts';

// Bounded fan-out within a single batch. Each per-tag task is mostly network I/O
// (two Brawl API calls + three Supabase upserts) and independent of the others,
// so concurrent execution drops wall time without much code. Capped to stay
// under the Brawl Stars per-key rate limit and avoid flooding the Supabase
// connection pool. Tunable in prod via env without a code change.
const BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY) || 10;

// Pulls fresh battles for one tag and persists them. Writes rely on ON CONFLICT
// DO NOTHING, so calling repeatedly is safe — existing rows are skipped at the
// DB layer.
async function processTag(playerTag: string): Promise<number> {
  const { tag, battles } = await fetchAndFormatBattles(playerTag);
  if (battles.length === 0) return 0;
  await persistNewBattles(tag, battles);
  return battles.length;
}

export interface BatchSummary {
  ok: number;
  failed: number;
}

// Processes one batch of player tags (e.g. the contents of one SQS message —
// up to 25 tags). For each tag: fetch from the Brawl API, reformat, and persist.
// Tags are supplied by the caller; this function never reads tags itself.
// Errors on one tag are logged and don't halt the rest — Promise.allSettled
// gives that isolation natively.
export async function processTagBatch(
  playerTags: string[],
): Promise<BatchSummary> {
  if (!playerTags || playerTags.length === 0) {
    return { ok: 0, failed: 0 };
  }

  const startedAt = Date.now();
  console.log(
    `processTagBatch: starting for ${playerTags.length} tags (concurrency=${BATCH_CONCURRENCY})`,
  );

  const limit = pLimit(BATCH_CONCURRENCY);
  const results = await Promise.allSettled(
    playerTags.map((tag) => limit(() => processTag(tag))),
  );

  let ok = 0;
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      ok += 1;
    } else {
      failed += 1;
      console.error(
        `processTagBatch: ${playerTags[i]} failed:`,
        r.reason?.message ?? r.reason,
      );
    }
  });

  const ms = Date.now() - startedAt;
  console.log(`processTagBatch: done in ${ms}ms — ok=${ok} failed=${failed}`);
  return { ok, failed };
}
