import type { Request, Response } from 'express';
import { prefixTagURLEncoded } from '../utils/brawl.js';
import { formatBattleLog } from '../utils/formatData.ts';
import type { RawBattleLog } from '../types/brawlApi.ts';

const BRAWL_API_BASE = 'https://api.brawlstars.com/v1/players';

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}` };
}

const controller = {
  // Kept for parity with the old router but not part of MVP.
  getPlayerData: async (req: Request, res: Response): Promise<Response> => {
    const { playerTag } = req.params;
    if (!playerTag) {
      return res.status(400).json({ error: 'must provide player tag' });
    }

    const formattedTag = prefixTagURLEncoded(playerTag);
    const playerRes = await fetch(`${BRAWL_API_BASE}/${formattedTag}/`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!playerRes.ok) {
      const body = await playerRes.text();
      console.error(`player fetch failed ${playerRes.status}:`, body);
      return res.status(502).json({ error: 'failed to pull from api' });
    }

    const playerData = await playerRes.json();
    return res.json({ playerData });
  },

  getPlayerBattleLog: async (req: Request, res: Response): Promise<Response> => {
    const { playerTag } = req.params;
    if (!playerTag) {
      return res.status(400).json({ error: 'Player tag is required' });
    }

    const formattedTag = prefixTagURLEncoded(playerTag);
    const battleLogRes = await fetch(
      `${BRAWL_API_BASE}/${formattedTag}/battlelog`,
      { method: 'GET', headers: authHeaders() },
    );

    if (!battleLogRes.ok) {
      const body = await battleLogRes.text();
      console.error(`battlelog fetch failed ${battleLogRes.status}:`, body);
      return res.status(502).json({ error: 'failed to pull from api' });
    }

    const raw = (await battleLogRes.json()) as RawBattleLog;
    const battles = formatBattleLog(raw);
    return res.json({ battles });
  },
};

export default controller;
