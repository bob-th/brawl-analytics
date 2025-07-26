console.log("🟢 INDEX.JS IS RUNNING");

import express from "express";
import dotenv from 'dotenv/config';
import path from 'path';


import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Current directory:", __dirname);

// Check if .env file exists
const envPath = path.resolve(__dirname, '.env');
console.log("Looking for .env at:", envPath);
console.log(".env exists?", fs.existsSync(envPath) ? "YES" : "NO");


console.log(process.env.PORT);

import cron from "node-cron";
import pLimit from 'p-limit';
import playerRouter from "./routes/playerRouter.js";
import userRouter from "./routes/userRouter.js";


const app = express();
const port = process.env.PORT;
<<<<<<< HEAD

console.log(process.env);
=======
>>>>>>> d1af6d5878c20e207a7bb403a4dbc04428fe61aa

app.use(express.json());

const requestLogger = (req, res, next) => {
  console.log(`Request received: ${req.method} ${req.originalUrl}`);
  next();
};

app.use('/api/',requestLogger); // Applies to all routes

app.use('/api/players/', playerRouter);
app.use('/api/users', userRouter);
app.listen(port, () => { 
  console.log(`web backend listening on port ${port}`);
});

/*
const CONCURRENCY_LIMIT = 5; // number of users to fetch in parallel

cron.schedule('0 3 * * *', async () => { // Runs daily at 3 AM
  console.log('Starting daily battle log fetch job...');

  const userIds = await getAllUserIds(); // however you track users

  const limit = pLimit(CONCURRENCY_LIMIT);

  const results = await Promise.allSettled(
    userIds.map(userId => 
      limit(() => fetchBattleLogForUser(userId))
    )
  );

  results.forEach((result, i) => {
    const userId = userIds[i];
    if (result.status === 'fulfilled') {
      console.log(`Fetched battle log for ${userId}`);
    } else {
      console.error(`Failed for ${userId}:`, result.reason);
    }
  });

  console.log('Battle log fetch job complete.');
});
*/