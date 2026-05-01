import playerController from "../controllers/playerController.js";
import { Router } from "express";

const router = Router();

router.get('/:playerTag/', playerController.getPlayerData);
router.get('/:playerTag/battles', playerController.getPlayerBattlesUnified);
router.get(
  '/:playerTag/brawlers/:brawlerId/battles',
  playerController.getPlayerBrawlerBattles
);
export default router; 