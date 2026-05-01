-- Brawl Analytics initial schema.
-- battle_id is md5(anchor_player_tag || '|' || battle_time_iso) — computed in app code, not DB-side.
-- anchor_player_tag is the lexicographically smallest player tag across all participants in the
-- battle. Sorting guarantees determinism regardless of API response ordering, so two independent
-- ingestions of the same physical battle produce the same battle_id. The same id is then used
-- when inserting battle_log rows for every player in that battle.

-- All tables live in the `private` schema. The schema IS listed in
-- supabase/config.toml -> api.schemas (required so supabase-js / PostgREST can
-- reach it), but the privacy boundary is enforced by grants: only service_role
-- has USAGE on the schema and any grants on the tables. anon and authenticated
-- get "permission denied" even if they hit the endpoint directly.
CREATE SCHEMA IF NOT EXISTS private;

-- Join of Supabase Auth users to the player tags they track.
CREATE TABLE private.user_players (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_tag)
);

-- One row per observed battle (per viewing player). No battle_time here — child tables carry it.
CREATE TABLE private.battle_info (
  battle_id  text PRIMARY KEY,
  mode_id    integer,
  map        text,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- Total trophies after the battle.
CREATE TABLE private.trophies_store (
  player_tag  text NOT NULL,
  battle_time timestamptz NOT NULL,
  trophies    integer NOT NULL,
  battle_id   text NOT NULL REFERENCES private.battle_info(battle_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_tag, battle_time)
);


-- Per-brawler trophies after the battle (the brawler the player used).
CREATE TABLE private.brawler_trophies_store (
  player_tag       text NOT NULL,
  battle_time      timestamptz NOT NULL,
  brawler          integer NOT NULL,
  brawler_trophies integer NOT NULL,
  battle_id        text NOT NULL REFERENCES private.battle_info(battle_id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_tag, battle_time)
);
CREATE INDEX brawler_trophies_brawler_time_idx
  ON private.brawler_trophies_store (player_tag, brawler, battle_time DESC);


-- Per-player result + trophy change for each observed battle.
-- result for team modes, rank for showdown; at least one must be set.
CREATE TYPE private.battle_result AS ENUM ('victory', 'defeat', 'draw');

CREATE TABLE private.battle_log (
  player_tag    text NOT NULL,
  battle_time   timestamptz NOT NULL,
  battle_id     text NOT NULL REFERENCES private.battle_info(battle_id) ON DELETE CASCADE,
  result        private.battle_result,
  rank          smallint,
  trophy_change integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_tag, battle_time),
  CHECK (result IS NOT NULL OR rank IS NOT NULL),
  CHECK (rank IS NULL OR (rank BETWEEN 1 AND 10))
);


-- Grants: only service_role (used by server-side code) can touch these tables.
-- anon and authenticated are deliberately not granted — this schema is server-only.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA private TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA private TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT ALL ON SEQUENCES TO service_role;
