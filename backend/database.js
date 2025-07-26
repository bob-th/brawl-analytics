import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log( process.env.PORT);
console.log("[DEBUG] Env SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("[DEBUG] Env SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env file!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);