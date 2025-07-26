import playerController from "../controllers/playerController.js";
import { Router } from "express";

const router = Router();

router.get('/:playerTag/', playerController.getPlayerData);
router.get('/:playerTag/battles', playerController.getBattleData);
export default router; 