import { prefixTagURLEncoded } from "../utils/brawl.js";
import { fetchWithHandling } from "../utils/fetch.js";
import { supabase } from "../database.js";
import { insertData } from "../utils/insertData.js";
import { mergeData } from "../utils/mergeData.js";

const supercell = process.env.SUPERCELL_DEV_KEY;
const controller = {
  getPlayerData: async (req, res) =>  {
    const {playerTag} = req.params;
    
    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"});
    }

    const {data, error} = await supabase
                                  .from('users')
                                  .select();
    if(error){
      return res.status(500).json({error: "database error"});
    }
    //const playerData = await fetchWithHandling(`${process.env.DATA_SERVICE_URL}/player/${playerTag}/`);
    //const playerLog = await fetchWithHandling(`${process.env.DATA_SERVICE_URL}/player/${playerTag}/battles`);

    res.json({playerData: playerData, playerLog: playerLog});
  },
  getBattleData: async (req, res) => {
    try{
    const {playerTag} = req.params;
    const BRAWL_DATA_URL = `http://localhost:4001/player/${prefixTagURLEncoded(playerTag)}/battles/`;
    //const fetchURL = `https://api.brawlstars.com/v1/players/${prefixTagURLEncoded(playerTag)}/battlelog`;
    console.log(`fetching from: ${BRAWL_DATA_URL}`)
    if (!playerTag) {
      return res.status(400).json({error: "must provide player tag"});
    }
    //const {data, error} = await supabase.from('player_log').insert(battles_to_store).select();
    //fetch from db
    const columns = 'supercell_id, battle_data, mode, map, battle_time'
    const {data: db_data, error: db_error} = await supabase.from('player_log').select(columns).order('battle_time');
    
    console.log("supercell_id: ", playerTag);
    console.log("db data: ", db_data.slice(0, 6));
    if (db_error) {
      console.error(`error msg: ${db_error.code} ${db_error.message}`);
      return res.status(500).json({error: "database error "});
    }
    //fetch from brawl-data-service microservice
  
    const api_result = await fetch(BRAWL_DATA_URL);
    if(!api_result.ok){
      
      console.error(`error msg: ${api_result.status}`);
      return res.status(500).json({error: "microservice error "});
    }
    const api_data = await api_result.json()
    //console.log(api_data);
    //first get data to user, combining recent api data with database data returns merged data and new data
    const [merged_data, new_data] = mergeData(db_data, api_data);

    res.json({battleLog: merged_data});
    
    await insertData(new_data);
    
    }catch(err){
      throw new Error(err.message);
      console.error(err.message)
      return res.status(500).json({error: err.message});
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