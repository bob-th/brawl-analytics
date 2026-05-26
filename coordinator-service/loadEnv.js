// Loads the shared environment file (infrastructure/.env) as a side effect,
// for LOCAL runs only (via local.js). The deployed Lambda never imports this —
// it reads env vars from its own function configuration. The path is resolved
// relative to this file so it works regardless of the working directory.
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../infrastructure/.env") });
