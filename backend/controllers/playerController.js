import { prefixTagURLEncoded } from "../utils/brawl.js";
import { fetchWithHandling } from "../utils/fetch.js";

const controller = {
  getPlayerData: async (req, res) =>  {
    const {playerTag} = req.params;

    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"})
    }

    const playerData = await fetchWithHandling(`${process.env.DATA_SERVICE_URL}/player/${playerTag}/`);
    const playerLog = await fetchWithHandling(`${process.env.DATA_SERVICE_URL}/player/${playerTag}/battles`);

    res.json({playerData: playerData, playerLog: playerLog})
  },
  
}  
export default controller;