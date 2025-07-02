import express from "express";
import dotenv from 'dotenv';
import battlesRouter from "./routes/battlesRouter.js";
import playerRouter from "./routes/playerRouter.js"
 
dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json()); 

app.use('/battles/', battlesRouter);
app.use('/player/', playerRouter); 

app.listen(port, () => {
  console.log(`brawl api listener on port ${port}`);
});