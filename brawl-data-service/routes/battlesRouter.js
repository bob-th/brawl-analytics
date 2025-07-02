import { Router } from "express";
import battlesController from "../controllers/battlesController.js"; 

const router = Router();

router.get('/:playerTag', battlesController.getBattleLogByPlayer);

export default router;