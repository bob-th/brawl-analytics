import userController from "../controllers/userController.js";
import { Router } from "express";

const router = Router();

router.get('/:session/supercell-ids', userController.getSupercellIds);

export default router; 