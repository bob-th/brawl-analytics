-- Per-participant outcome encoded as a single numeric column.
--
-- Encoding (interpretation depends on the battle's mode):
--   Team modes (brawl ball, bounty, gem grab, hot zone, knockout, ...):
--     1  = victory
--     0  = loss
--    -1  = draw (sentinel — distinct from NULL so 'draw' is recoverable)
--   Solo showdown (battle.players flat list of 10):
--     1..10 = finish placement (index in the API's players[] + 1)
--   Showdown duo (battle.teams of N sub-arrays of 2):
--     1..N  = team placement (every member of the team gets the same number)
--   NULL = unknown / historical pre-migration row (cannot be derived;
--          team membership was discarded by the old formatter).
--
-- For the queried player this duplicates battle_log.result (encoded as a
-- number). Both derive from the same upstream raw.battle.result/rank, so
-- they agree by construction for the queried-player row.
ALTER TABLE private.brawler_trophies_store
  ADD COLUMN placement smallint;
