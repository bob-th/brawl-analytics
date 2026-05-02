// Manually invoke syncAllPlayers so we can observe timing + behavior at will
// without waiting 30 minutes for the next cron tick.
//
// Run from anywhere in the repo:
//   node backend/tests/syncAllPlayers.js
//
// Override the concurrency cap on the fly:
//   SYNC_CONCURRENCY=10 node backend/tests/syncAllPlayers.js
//
// Loads env from backend/.env relative to this file, so cwd doesn't matter.
// dotenv does not overwrite existing env vars, so SYNC_CONCURRENCY=N on the
// command line still wins.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

// Import after env is loaded — battleSync's transitive imports (database.js)
// throw at module-load time if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// missing.
const { syncAllPlayers } = await import("../services/battleSync.js");

console.log("running syncAllPlayers...");
await syncAllPlayers();
console.log("done.");
process.exit(0);
