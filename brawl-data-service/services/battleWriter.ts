import { supabase } from '../database.ts';
import { buildBatchRows } from './battleRows.ts';
import type { BattleGroup } from './battleRows.ts';
import type { FormattedBattle } from '../types/battle.ts';

export type { BattleGroup } from './battleRows.ts';

// Persists formatted battles that aren't yet in the DB. Expands per the schema:
//   battle_info            : 1 row per battle
//   battle_log             : 1 row per battle (query player) — carries `trophies`
//   brawler_trophies_store : N rows per battle (one per participant)
// All upserts use ON CONFLICT DO NOTHING — battles are immutable once written,
// so re-running for the same tag is a safe no-op. Ported from the backend's
// services/battleWriter.js.
//
// Batches every group passed in into a single upsert per table, so one SQS
// message (≤25 tags) costs three DB round-trips total instead of three per tag.
// Row building and the cross-player de-duplication that batching requires live
// in buildBatchRows (pure, O(N), unit-tested); here we just run the upserts.
export async function persistNewBattlesBatch(
  groups: BattleGroup[],
): Promise<void> {
  const { infoRows, logRows, brawlerTrophiesRows } = buildBatchRows(groups);

  if (infoRows.length === 0) return;

  // battle_info first (parent FK). Abort child writes if this fails — child
  // rows would violate the FK. Logged rather than thrown: one write now spans
  // many tags and the coordinator re-enqueues every tick, so a failure
  // self-heals instead of sinking the whole message.
  const infoRes = await supabase
    .from('battle_info')
    .upsert(infoRows, { onConflict: 'battle_id', ignoreDuplicates: true });
  if (infoRes.error) {
    console.error(`battle_info upsert failed: ${infoRes.error.message}`);
    return;
  }

  const [logRes, brawlerRes] = await Promise.allSettled([
    supabase
      .from('battle_log')
      .upsert(logRows, {
        onConflict: 'player_tag,battle_time',
        ignoreDuplicates: true,
      }),
    supabase
      .from('brawler_trophies_store')
      .upsert(brawlerTrophiesRows, {
        onConflict: 'player_tag,battle_time',
        ignoreDuplicates: true,
      }),
  ]);

  for (const [name, res] of [
    ['battle_log', logRes],
    ['brawler_trophies_store', brawlerRes],
  ] as const) {
    if (res.status === 'rejected') {
      console.error(`${name} upsert rejected:`, res.reason);
    } else if (res.value?.error) {
      console.error(`${name} upsert error:`, res.value.error);
    }
  }
}

// Single-tag convenience wrapper, kept for API compatibility with the original
// per-tag write path. Delegates to the batched writer with one group.
export async function persistNewBattles(
  queryPlayerTag: string,
  battles: FormattedBattle[],
): Promise<void> {
  if (!battles || battles.length === 0) return;
  await persistNewBattlesBatch([{ queryPlayerTag, battles }]);
}
