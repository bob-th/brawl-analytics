import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service_role key, which bypasses RLS and is the
// only role granted access to the `private` schema. This key must never be
// exposed to the browser. Mirrors backend/database.js so the coordinator reads
// the exact same tables the cron job did.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  db: { schema: "private" },
  auth: { persistSession: false, autoRefreshToken: false },
});
