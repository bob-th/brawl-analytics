-- Add detailed_battle_log view for endpoints that need mode and map per row
-- (metrics aggregation, recent-battles detail view, and any future endpoints
-- that need the fully-joined battle row).
--
-- Kept SEPARATE from brawler_battle_log on purpose: the per-brawler battle log
-- endpoint does not need mode_id/map, so folding the battle_info join into
-- brawler_battle_log would force every query against it to pay for an extra
-- join it doesn't use. Two views = each consumer pays only for the joins it
-- actually needs.
--
-- The defensive DROP+CREATE for brawler_battle_log handles the case where an
-- earlier draft of this migration (which extended brawler_battle_log inline)
-- was applied before this one. CREATE OR REPLACE VIEW cannot drop columns,
-- so a plain replace would fail in that case. If the earlier draft was never
-- applied, this just rewrites brawler_battle_log to its existing definition —
-- a no-op in terms of schema shape. brawler_battle_log has no dependents, so
-- DROP IF EXISTS is safe without CASCADE.

DROP VIEW IF EXISTS private.brawler_battle_log;

CREATE VIEW private.brawler_battle_log AS
SELECT
  bl.player_tag,
  bl.battle_time,
  bl.battle_id,
  bl.result,
  bl.rank,
  bl.trophy_change,
  bl.trophies,
  bts.brawler,
  bts.brawler_trophies
FROM private.battle_log bl
JOIN private.brawler_trophies_store bts
  ON bts.player_tag = bl.player_tag
 AND bts.battle_time = bl.battle_time;

GRANT SELECT ON private.brawler_battle_log TO service_role;


CREATE OR REPLACE VIEW private.detailed_battle_log AS
SELECT
  bl.player_tag,
  bl.battle_time,
  bl.battle_id,
  bl.result,
  bl.rank,
  bl.trophy_change,
  bl.trophies,
  bts.brawler,
  bts.brawler_trophies,
  bi.mode_id,
  bi.map
FROM private.battle_log bl
JOIN private.brawler_trophies_store bts
  ON bts.player_tag = bl.player_tag
 AND bts.battle_time = bl.battle_time
JOIN private.battle_info bi
  ON bi.battle_id = bl.battle_id;

GRANT SELECT ON private.detailed_battle_log TO service_role;
