import { battle } from "../models/battlesModel.js"
//resource is the raw data from brawl stars api
export function formatData(resource, supercell_id){
    const battles_log = resource.items;
    console.log("see battle:", battles_log[0].battleTime);
    console.log("see battle:", battles_log[0].battle);
    if(battles_log.length == 0){
        throw new Error('Empty battle list');
    }
    const battles_to_store = new Array(battles_log.length);
    for(let i = 0; i < battles_log.length; i++){
        battles_to_store[i] = new battle(supercell_id, battles_log[i].battle, 
                                        battles_log[i].battleTime, 
                                        battles_log[i].event.mode,
                                        battles_log[i].event.map);
        }
    console.log(`example battle log:`, battles_to_store[0]);
    return battles_to_store;
}