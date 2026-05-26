import { supabase } from '../database.ts';
import { brawlTimeToIso } from '../utils/time.ts';
import type { FormattedBattle } from '../types/battle.ts';

// Persists formatted battles that aren't yet in the DB. Expands per the schema:
//   battle_info            : 1 row per battle
//   battle_log             : 1 row per battle (query player) — carries `trophies`
//   brawler_trophies_store : N rows per battle (one per participant)
// All upserts use ON CONFLICT DO NOTHING — battles are immutable once written,
// so re-running for the same tag is a safe no-op. Ported from the backend's
// services/battleWriter.js.
export async function persistNewBattles(
  queryPlayerTag: string,
  battles: FormattedBattle[],
): Promise<void> {
  if (!battles || battles.length === 0) return;

  const infoRows = [];
  const logRows = [];
  const brawlerTrophiesRows = [];

  for (const b of battles) {
    const battleTimeIso = brawlTimeToIso(b.battleTime);

    infoRows.push({
      battle_id: b.battleId,
      mode_id: b.modeId,
      map: b.map,
      battle_level: b.battleLevel,
    });

    logRows.push({
      player_tag: queryPlayerTag,
      battle_time: battleTimeIso,
      battle_id: b.battleId,
      result: b.result,
      rank: b.rank,
      trophy_change: b.trophyChange ?? 0,
      trophies: b.totalTrophies,
    });

    for (const p of b.players ?? []) {
      brawlerTrophiesRows.push({
        player_tag: p.playerTag,
        battle_time: battleTimeIso,
        brawler: p.brawlerId,
        brawler_trophies: p.trophies,
        battle_id: b.battleId,
        placement: p.placement ?? null,
      });
    }
  }

  // battle_info first (parent FK). Abort child writes if this fails — child
  // rows would violate the FK.
  const infoRes = await supabase
    .from('battle_info')
    .upsert(infoRows, { onConflict: 'battle_id', ignoreDuplicates: true });
  if (infoRes.error) {
    throw new Error(`battle_info upsert failed: ${infoRes.error.message}`);
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
