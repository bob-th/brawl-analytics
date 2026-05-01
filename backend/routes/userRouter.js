import userController from "../controllers/userController.js";
import { Router } from "express";

const router = Router();

router.post('/:userId/players', userController.registerPlayer);

export default router;