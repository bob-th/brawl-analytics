import express from "express";
import dotenv from 'dotenv/config';

import cron from "node-cron";
import playerRouter from "./routes/playerRouter.js";
import userRouter from "./routes/userRouter.js";
import cors from "cors";
import { syncAllPlayers } from "./services/battleSync.js";

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

// Every 30 minutes, pull fresh DS battles for every tracked player tag and
// upsert them. Fire-and-forget — errors are logged inside syncAllPlayers.
cron.schedule("*/30 * * * *", () => {
  syncAllPlayers().catch((err) =>
    console.error("cron syncAllPlayers failed:", err)
  );
});

app.listen(port, () => {
  console.log(`web backend listening on port ${port}`);
});
