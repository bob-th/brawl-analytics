import type { Request, Response } from 'express';
import { prefixTagURLEncoded } from '../utils/brawl.js';
import { formatBattleLog } from '../utils/formatData.ts';
import { formatPlayerInfo } from '../utils/formatPlayer.ts';
import type { RawBattleLog, RawPlayerInfo } from '../types/brawlApi.ts';

const BRAWL_API_BASE = 'https://api.brawlstars.com/v1/players';

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}` };
}

const controller = {
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

    const raw = (await playerRes.json()) as RawPlayerInfo;
    
    const player = formatPlayerInfo(raw);
    return res.json(player);
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
