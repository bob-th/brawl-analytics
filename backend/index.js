import express from "express";
import dotenv from 'dotenv';
import cron from "node-cron";
import pLimit from 'p-limit';
import playerRouter from "./routes/playerRouter.js";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.use('/api/player', playerRouter);

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