import express from "express";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.use()

app.listen(port, () => {
  console.log(`brawl api listener on port ${port}`);
});