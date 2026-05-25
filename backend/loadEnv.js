// Loads the shared environment file (infrastructure/.env) as a side effect.
// The path is resolved relative to this file, so it works regardless of the
// current working directory. Import this FIRST in entrypoints, before any
// module that reads process.env (e.g. database.js).
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../infrastructure/.env") });
