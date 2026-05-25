import './loadEnv.js';
import express from "express";

import playerRouter from "./routes/playerRouter.js";
import userRouter from "./routes/userRouter.js";
import cors from "cors";

const app = express();
const port = process.env.BACKEND_PORT;

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
