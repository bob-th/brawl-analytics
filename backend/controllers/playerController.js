import { prefixTagURLEncoded } from "../utils/brawl.js";

const controller = {
  getPlayerData: async (req, res) =>  {
    const {playerTag} = req.params;

    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"})
    }

    const formattedTag = prefixTagURLEncoded(playerTag);
    const playerRes = await fetch(`https://api.brawlstars.com/v1/players/${formattedTag}/`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}`,
        }
      }
    )

    const playerData = await playerRes.json();

    res.json({playerData: playerData})
  },
  getPlayerBattleLog : async (req, res) => {
      const { playerTag } = req.params;
  
      if (!playerTag) {
        return res.status(400).json({ error: 'Player tag is required' });
      }
      const formattedTag = prefixTagURLEncoded(playerTag);
      const battleLogRes = await fetch(`${process.env.BRAWL_API_BASE_URL}/players/${formattedTag}/`, {
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