import { prefixTagURLEncoded } from "../utils/brawl.js";
import { fetchWithHandling } from "../utils/fetch.js";
import { supabase } from "../database.js";
const controller = {
  getPlayerData: async (req, res) =>  {
    const {playerTag} = req.params;

    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"});
    }

    const {data, error} = await supabase
                                  .from('users')
                                  .select();
    //const playerData = await fetchWithHandling(`${process.env.DATA_SERVICE_URL}/player/${playerTag}/`);
    //const playerLog = await fetchWithHandling(`${process.env.DATA_SERVICE_URL}/player/${playerTag}/battles`);

    res.json({playerData: playerData, playerLog: playerLog});
  },
  getBattleData: async (req, res) => {
    try{
    
    const {playerTag} = req.params;
    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"});
    }
    const {data, error} = await supabase.from('battles').select('battle_data').eq('supercell_id', playerTag);

    if (error) {
      return res.status(500).json({error: "database error"});
    }

    res.json({battleLog: data});
    }catch(err){
      return res.status(err.status).json({error: "general error"});
    }
  }
  /*,
  addBattleData: async (req, res) => {
    try{
    const {playerTag} = req.params;
    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"});
    }
    const {data} = await supabase.from('battles').select('battle_data').eq('supercell_id', playerTag);
    res.json({battleLog: data});
    }catch(err){
      return res.status(err.status).json({err: "database error"})
    }
  }*/
}  
export default controller;