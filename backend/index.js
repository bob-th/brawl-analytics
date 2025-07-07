import express from "express";
import cron from "node-cron";

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.listen(port, () => {
  console.log(`web backend listening on port ${port}`);
});

// fetch battle log data every 24 hrs
cron.schedule('* * * * *', () => {
  // Get the user ids we want to update

  // Then fetch their battle log one by one

});