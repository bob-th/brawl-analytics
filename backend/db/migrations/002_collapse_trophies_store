-- Collapse trophies_store into battle_log.
-- trophies_store and battle_log shared the same composite PK (player_tag, battle_time)
-- and were 1:1, so the split was over-normalization. Folding `trophies` into
-- battle_log lets endpoint 1 fetch with a single query (no client-side zip).
--
-- For endpoint 2 (per-brawler battle log) we add a view that joins battle_log
-- and brawler_trophies_store on (player_tag, battle_time). PostgREST exposes
-- the view as a queryable resource so the backend can filter by brawler in a
-- single round-trip instead of fetching both sides and joining in JS.

-- 1) Add trophies column to battle_log and backfill from trophies_store.
ALTER TABLE private.battle_log
  ADD COLUMN trophies integer;

UPDATE private.battle_log bl
SET trophies = ts.trophies
FROM private.trophies_store ts
WHERE ts.player_tag = bl.player_tag
  AND ts.battle_time = bl.battle_time;

-- 2) Drop the now-redundant table.
DROP TABLE private.trophies_store;

-- 3) Brawler-joined view for endpoint 2.
-- Inner-join semantics: only rows where the player has a brawler_trophies_store
-- entry for that battle survive — i.e. battles where this player is recorded
-- as a participant (which is every battle in our ingest pipeline).
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

-- Views need explicit grants — ALTER DEFAULT PRIVILEGES from the initial
-- migration only fires for tables/sequences.
GRANT SELECT ON private.brawler_battle_log TO service_role;
