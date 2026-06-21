-- Rough per-battle trophy level (1:1 with the battle). Currently the queried
-- player's total trophies after the battle; written by the data service.
-- Lets the analytics ETL assign a trophy band to non-queried participants,
-- who have no battle_log row and thus no per-player overall_trophies.
ALTER TABLE private.battle_info
  ADD COLUMN battle_level integer;

-- Re-state detailed_battle_log with battle_level appended (CREATE OR REPLACE
-- can only add columns at the end). brawler_battle_log intentionally omits the
-- battle_info join, so it is left unchanged. Grants are preserved by REPLACE.
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
  bi.map,
  bi.battle_level
FROM private.battle_log bl
JOIN private.brawler_trophies_store bts
  ON bts.player_tag = bl.player_tag
 AND bts.battle_time = bl.battle_time
JOIN private.battle_info bi
  ON bi.battle_id = bl.battle_id;
