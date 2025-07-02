import { prefixTagURLEncoded } from "../utils/brawl.js";

const controller = {
  getPlayerData: async (req, res) =>  {
    const {playerTag} = req.params;

    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"})
    }

    const formattedTag = prefixTagURLEncoded(playerTag);
    console.log(`https://api.brawlstars.com/v1/players/${formattedTag}/battlelog`);
    const playerRes = await fetch(`https://api.brawlstars.com/v1/players/${formattedTag}/`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${process.env.BRAWL_DEVELOPER_API_KEY}`,
        }
      }
    )

    const playerData = await playerRes.json();

    res.json({playerData: playerData})
  }
}  
export default controller;