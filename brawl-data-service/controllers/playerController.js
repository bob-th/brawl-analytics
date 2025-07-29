import { prefixTagURLEncoded } from "../utils/brawl.js";
import { formatData } from "../utils/formatData.js";
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
      const battleLogRes = await fetch(`https://api.brawlstars.com/v1/players/${formattedTag}/battlelog`, {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}`,
          }
        }
      );
      
      if(!battleLogRes.ok){
        const body = await battleLogRes.text();
        console.log(`failed with status ${battleLogRes.status}: `,body);
        throw new Error("failed to pull from api");
      } 

      const battleLogData = await battleLogRes.json();
      //console.log(battleLogData);
      const battlesFormatted = formatData(battleLogData, playerTag);
      res.json({battles: battlesFormatted});
    },
}  
export default controller;