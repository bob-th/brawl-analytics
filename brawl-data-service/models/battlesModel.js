export const battle = class battle_log{
    constructor(player_id, battle_rec, time, mode, map){
        this.battle_time = time;
        this.supercell_id = player_id;
        this.battle_data = battle_rec;
        this.mode = mode;
        this.map = map;
    }
    printBattles(){
        console.log(`player id: ${supercell_id} battle: ${battle_data} time: ${battle_time}`);
    }
}
