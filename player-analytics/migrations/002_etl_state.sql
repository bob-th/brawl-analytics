-- Watermark for incremental ETL loads.
--   key                       : logical job name. 'brawler_fact_load' is
--                               the only entry today.
--   last_processed_created_at : exclusive lower bound on OLTP
--                               brawler_trophies_store.created_at for the
--                               next run. Using created_at (not
--                               battle_time) means out-of-order battle
--                               arrivals — a player tag that was offline
--                               for days, then returns 25 backfilled rows
--                               — still get picked up.
CREATE TABLE public.etl_state (
  key                       text PRIMARY KEY,
  last_processed_created_at timestamptz NOT NULL,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Seed at epoch so the first run processes everything currently in OLTP.
INSERT INTO public.etl_state (key, last_processed_created_at)
VALUES ('brawler_fact_load', '1970-01-01T00:00:00Z');
