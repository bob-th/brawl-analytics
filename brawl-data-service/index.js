import './loadEnv.js';
import express from "express";
import playerRouter from "./routes/playerRouter.js";
import cron from "node-cron";


const app = express();
const port = process.env.DATA_SERVICE_PORT;

app.use(express.json());

app.use('/player/', playerRouter);

app.listen(port, () => {
  console.log(`brawl api listener on port ${port}`);
});
