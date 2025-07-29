import { supabase } from "../database.js";
import { battle } from "../models/battlesModel.js"

export async function insertData(battles_to_store){
    
    /*const options = {
        method: 'GET',
        headers: {
        'Authorization': `Bearer ${process.env.SUPERCELL_DEV_KEY}`,
        }
    }
    const res = await fetch(url, options);
    console.log(res.body)
    console.log(res.status)
    if (!res.ok) {
        const body = await res.text();
        console.error(`HTTP error from ${url} (${res.status}):`, body);
        throw new Error(`Request to ${url} failed with status ${res.status}`);
    }
    const result = await res.json();
    console.log(result);
    const battles_log = result.items;
    
    if(battles_log.length == 0){
        throw new Error('Empty battle list');
    }
    const battles_to_store = new Array(battles_log.length);
    //try {
        for(let i = 0; i < battles_log.length; i++){
            battles_to_store[i] = new battle(playerid, battles_log[i].battle, 
                                        battles_log[i].battleTime, 
                                        battles_log[i].event.mode,
                                        battles_log[i].event.map);
        }
        console.log(`example battle log:`, battles_to_store[0]);
    */
    
    const {data, error} = await supabase.from('player_log').insert(battles_to_store).select();
    console.log('attempted to insert', data);
    if(error){
        console.log("had error");
        throw new Error(`Request to supabase failed with status ${error.message}, code: ${error.code}`);
    }
    //}
    /*catch(err) {
        console.error("Insertion Failed:", err);
        throw err;
    }*/

}