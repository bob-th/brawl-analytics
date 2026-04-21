-- Brawl Analytics initial schema.
-- battle_id is md5(player_tag || '|' || battle_time_iso) — computed in app code, not DB-side.
-- Same physical battle observed in two tracked players' logs yields two distinct battle_ids by design.

-- Join of Supabase Auth users to the player tags they track.
CREATE TABLE user_players (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_tag)
);
CREATE INDEX user_players_player_tag_idx ON user_players (player_tag);


-- One row per observed battle (per viewing player). No battle_time here — child tables carry it.
CREATE TABLE battle_info (
  battle_id  text PRIMARY KEY,
  mode_id    integer,
  map        text,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- Total trophies after the battle.
CREATE TABLE trophies_store (
  player_tag  text NOT NULL,
  battle_time timestamptz NOT NULL,
  trophies    integer NOT NULL,
  battle_id   text NOT NULL REFERENCES battle_info(battle_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_tag, battle_time)
);
CREATE INDEX trophies_store_time_idx
  ON trophies_store (player_tag, battle_time DESC);


-- Per-brawler trophies after the battle (the brawler the player used).
CREATE TABLE brawler_trophies_store (
  player_tag       text NOT NULL,
  battle_time      timestamptz NOT NULL,
  brawler          integer NOT NULL,
  brawler_trophies integer NOT NULL,
  battle_id        text NOT NULL REFERENCES battle_info(battle_id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_tag, battle_time)
);
CREATE INDEX brawler_trophies_brawler_time_idx
  ON brawler_trophies_store (player_tag, brawler, battle_time DESC);


-- Per-player result + trophy change for each observed battle.
-- result for team modes, rank for showdown; at least one must be set.
CREATE TYPE battle_result AS ENUM ('victory', 'defeat', 'draw');

CREATE TABLE battle_log (
  player_tag    text NOT NULL,
  battle_id     text NOT NULL REFERENCES battle_info(battle_id) ON DELETE CASCADE,
  battle_time   timestamptz NOT NULL,
  result        battle_result,
  rank          smallint,
  trophy_change integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_tag, battle_id),
  CHECK (result IS NOT NULL OR rank IS NOT NULL),
  CHECK (rank IS NULL OR (rank BETWEEN 1 AND 10))
);
CREATE INDEX battle_log_time_idx ON battle_log (player_tag, battle_time DESC);
