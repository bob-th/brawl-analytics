import express from "express";
import dotenv from 'dotenv/config';

import cron from "node-cron";
import pLimit from 'p-limit';
import playerRouter from "./routes/playerRouter.js";
import userRouter from "./routes/userRouter.js";
import cors from "cors";

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173'
}));

const requestLogger = (req, res, next) => {
  console.log(`Request received: ${req.method} ${req.originalUrl}`);
  next();
};

app.use('/api/', requestLogger); // Applies to all routes

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