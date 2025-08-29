import { battle } from "../models/battlesModel.js"
const manualDateFix = (dateStr) => {
  const year = dateStr.substr(0, 4);
  const month = dateStr.substr(4, 2);
  const day = dateStr.substr(6, 2);
  const hour = dateStr.substr(9, 2);
  const minute = dateStr.substr(11, 2);
  const second = dateStr.substr(13, 2);
  const ms = dateStr.substr(16, 3);
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}Z`;
}
//finds data from api which is not in db
const findExclusiveData = (database_data, api_data) => {
    try{
        console.log("db time: ", database_data[database_data.length - 1].battle_time);
        console.log("api time: ", api_data[0].battle_time);
        let end;
        api_data.length < 30 ? end = api_data.length: end = 30;
        const to_compare = new Date(database_data[database_data.length - 1].battle_time).getTime();
        const api_first = new Date(manualDateFix(api_data[0].battle_time)).getTime();
        console.log(`database data time: ${to_compare} vs api time: ${api_first}`);
        for(let i = 0; i < end; i++) {

            let api_date = new Date(manualDateFix(api_data[i].battle_time)).getTime();
            console.log(`database data time: ${to_compare} vs api time: ${api_date}`);
            if(to_compare > api_date){
                throw new Error("error with finding overlap");
            }
            else if(to_compare === api_date){
                console.log("found equivalent");
                return api_data.slice(0, i);
            }
            
        }
        //if no overlap:
        console.log("no overlap");
        return api_data;
    }catch(err){
      console.error("error with exclusive data");
      throw new Error(err.message);
    }
    //navigate through last 30 reqs, 
}
//merge api data (json) with db data (array)
export function mergeData(database_data, api_data){
    const api_array = api_data.battles;
    const exclusive = findExclusiveData(database_data, api_array);
    //merges exclusive data with database data
    const merged = [...database_data, ...exclusive]
    return [merged, exclusive];
}