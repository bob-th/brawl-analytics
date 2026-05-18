-- Lock the analytics DB down to service_role only.
--
-- How this works in Supabase:
--   * `service_role` has the BYPASSRLS Postgres attribute, so it sees every
--     row no matter what RLS policies say.
--   * `anon` and `authenticated` (the public-facing API keys) are NOT
--     BYPASSRLS. With RLS enabled and zero policies, every row is invisible
--     to them — SELECT returns 0 rows, INSERT/UPDATE/DELETE are rejected.
--   * That makes ENABLE RLS + no policies a hard "service-role key only"
--     gate for the analytics DB. The frontend (which only ever holds the
--     anon key) cannot reach this data.
--
-- We also REVOKE table-level grants from anon/authenticated as
-- defense-in-depth, so even if someone later adds a policy by mistake the
-- privilege boundary still holds.

-- Star schema dims
ALTER TABLE public.date_dim                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brawler_dim             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_dim              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trophy_band_dim         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brawler_trophy_band_dim ENABLE ROW LEVEL SECURITY;

-- Fact table
ALTER TABLE public.brawler_fact            ENABLE ROW LEVEL SECURITY;

-- ETL operational state
ALTER TABLE public.etl_state               ENABLE ROW LEVEL SECURITY;

-- Strip the default public-schema grants from the non-bypassing roles.
-- service_role inherits ALL via its role definition and is unaffected.
REVOKE ALL ON
  public.date_dim,
  public.brawler_dim,
  public.battle_dim,
  public.trophy_band_dim,
  public.brawler_trophy_band_dim,
  public.brawler_fact,
  public.etl_state
FROM anon, authenticated;
