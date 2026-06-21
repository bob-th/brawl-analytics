import { brawlTimeToIso } from '../utils/time.ts';
import type { FormattedBattle } from '../types/battle.ts';

// One query player's freshly-fetched battles, as produced by the fetch phase of
// processTagBatch. Grouping by query player lets the writer stamp battle_log /
// brawler_trophies rows with the right player_tag while still coalescing every
// group into one write per table.
export interface BattleGroup {
  queryPlayerTag: string;
  battles: FormattedBattle[];
}

// Row shapes mirror the columns of each target table (see battleWriter).
export interface BattleInfoRow {
  battle_id: string;
  mode_id: number | null;
  map: string;
  battle_level: number;
}

export interface BattleLogRow {
  player_tag: string;
  battle_time: string;
  battle_id: string;
  result: 'victory' | 'defeat' | 'draw' | null;
  rank: number | null;
  trophy_change: number;
  trophies: number;
}

export interface BrawlerTrophiesRow {
  player_tag: string;
  battle_time: string;
  brawler: number;
  brawler_trophies: number;
  battle_id: string;
  placement: number | null;
}

export interface BatchRows {
  infoRows: BattleInfoRow[];
  logRows: BattleLogRow[];
  brawlerTrophiesRows: BrawlerTrophiesRow[];
}

// Conflict-key separator. A space can't appear in a player tag (alphanumeric,
// '#' prefixed) or an ISO timestamp, so `tag + SEP + time` is collision-free.
const KEY_SEP = ' ';

// Flattens every group into the three per-table row arrays, de-duplicating by
// each table's ON CONFLICT key as it goes. Merging across query players means a
// row can surface twice in one batch — two queried players in the same battle
// share a battle_id, and a participant in two queried players' logs shares a
// (player_tag, battle_time). Postgres can't apply ON CONFLICT against another
// row inserted by the same statement, so those duplicates must be dropped here.
//
// Single O(N) pass over all battles/participants: build + de-dup share the loop,
// each conflict key guarded by a Set. Pure (no I/O) so it's unit-testable on its
// own; persistNewBattlesBatch wraps it with the upserts.
export function buildBatchRows(groups: BattleGroup[]): BatchRows {
  const infoRows: BattleInfoRow[] = [];
  const logRows: BattleLogRow[] = [];
  const brawlerTrophiesRows: BrawlerTrophiesRow[] = [];

  const seenInfo = new Set<string>(); // battle_id
  const seenLog = new Set<string>(); // player_tag + battle_time
  const seenBrawler = new Set<string>(); // player_tag + battle_time

  for (const { queryPlayerTag, battles } of groups) {
    for (const b of battles) {
      const battleTimeIso = brawlTimeToIso(b.battleTime);

      if (!seenInfo.has(b.battleId)) {
        seenInfo.add(b.battleId);
        infoRows.push({
          battle_id: b.battleId,
          mode_id: b.modeId,
          map: b.map,
          battle_level: b.battleLevel,
        });
      }

      const logKey = `${queryPlayerTag}${KEY_SEP}${battleTimeIso}`;
      if (!seenLog.has(logKey)) {
        seenLog.add(logKey);
        logRows.push({
          player_tag: queryPlayerTag,
          battle_time: battleTimeIso,
          battle_id: b.battleId,
          result: b.result,
          rank: b.rank,
          trophy_change: b.trophyChange ?? 0,
          trophies: b.totalTrophies,
        });
      }

      for (const p of b.players ?? []) {
        const brawlerKey = `${p.playerTag}${KEY_SEP}${battleTimeIso}`;
        if (seenBrawler.has(brawlerKey)) continue;
        seenBrawler.add(brawlerKey);
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
  }

  return { infoRows, logRows, brawlerTrophiesRows };
}
