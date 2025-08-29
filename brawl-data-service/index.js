import express from "express";
import dotenv from 'dotenv/config';
import playerRouter from "./routes/playerRouter.js";
import cron from "node-cron"; 


const app = express();
const port = process.env.PORT;

app.use(express.json()); 

app.use('/player/', playerRouter); 

app.listen(port, () => {
  console.log(`brawl api listener on port ${port}`);
});

// fetch the most recent player battles
// one fetch every 24 hrs
cron.schedule('* * * * *', () => {
  console.log("test");
});