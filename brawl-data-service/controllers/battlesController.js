import { prefixTag, prefixTagURLEncoded } from "../utils/brawl.js";

const controller = {
  getBattleLogByPlayer : async (req, res) => {
    const { playerTag } = req.params;

    if (!playerTag) {
      return res.status(400).json({ error: 'Player tag is required' });
    }
    const formattedTag = prefixTagURLEncoded(playerTag);
    const battleLogRes = await fetch(`https://api.brawlstars.com/v1/players/${formattedTag}/`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}`,
        }
      }
    )
    const battleLogData = await battleLogRes.json();

    res.json({ playerTag: prefixTag(playerTag), count: battleLogData.items.length, battles: battleLogData });
  },

}
export default controller;