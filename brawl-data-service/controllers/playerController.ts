import type { Request, Response } from 'express';
import {
  fetchAndFormatBattles,
  fetchAndFormatPlayer,
} from '../services/brawlClient.ts';

const controller = {
  getPlayerData: async (req: Request, res: Response): Promise<Response> => {
    const { playerTag } = req.params;
    if (typeof playerTag !== 'string' || !playerTag) {
      return res.status(400).json({ error: 'must provide player tag' });
    }

    try {
      const player = await fetchAndFormatPlayer(playerTag);
      return res.json(player);
    } catch (err) {
      console.error('getPlayerData failed:', err);
      return res.status(502).json({ error: 'failed to pull from api' });
    }
  },

  getPlayerBattleLog: async (req: Request, res: Response): Promise<Response> => {
    const { playerTag } = req.params;
    if (typeof playerTag !== 'string' || !playerTag) {
      return res.status(400).json({ error: 'Player tag is required' });
    }

    try {
      const { battles } = await fetchAndFormatBattles(playerTag);
      return res.json({ battles });
    } catch (err) {
      console.error('getPlayerBattleLog failed:', err);
      return res.status(502).json({ error: 'failed to pull from api' });
    }
  },
};

export default controller;
