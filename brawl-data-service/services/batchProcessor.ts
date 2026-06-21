import pLimit from 'p-limit';
import { fetchAndFormatBattles } from './brawlClient.ts';
import { persistNewBattlesBatch } from './battleWriter.ts';
import type { BattleGroup } from './battleWriter.ts';

// Bounded fan-out within a single batch. Each per-tag task is now just the
// network I/O (two Brawl API calls) — persistence is deferred to one batched
// write after every fetch resolves. Sized to one SQS message's worth of tags
// (≤25) so a full message fetches in a single wave, while still capping load on
// the Brawl Stars per-key rate limit. Tunable in prod via env without a code
// change.
const BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY) || 25;

export interface BatchSummary {
  ok: number;
  failed: number;
}

// Processes one batch of player tags (e.g. the contents of one SQS message —
// up to 25 tags). Fetch + reformat run concurrently per tag; the battles from
// every tag that fetched successfully are then persisted in a single batched
// write per table (see persistNewBattlesBatch), so one message costs three DB
// round-trips instead of three per tag. Tags are supplied by the caller; this
// function never reads tags itself. A fetch error on one tag is logged and
// doesn't halt the rest — Promise.allSettled gives that isolation natively, and
// the surviving tags still get written.
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
    playerTags.map((tag) => limit(() => fetchAndFormatBattles(tag))),
  );

  // ok/failed reflect the fetch phase — tags whose battles made it into the
  // batched write. Write errors span the whole batch and are logged inside
  // persistNewBattlesBatch rather than attributed to a single tag.
  let ok = 0;
  let failed = 0;
  const groups: BattleGroup[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      ok += 1;
      const { tag, battles } = r.value;
      if (battles.length > 0) {
        groups.push({ queryPlayerTag: tag, battles });
      }
    } else {
      failed += 1;
      console.error(
        `processTagBatch: ${playerTags[i]} failed:`,
        r.reason?.message ?? r.reason,
      );
    }
  });

  // One batched write per table for the whole message.
  await persistNewBattlesBatch(groups);

  const ms = Date.now() - startedAt;
  console.log(`processTagBatch: done in ${ms}ms — ok=${ok} failed=${failed}`);
  return { ok, failed };
}
