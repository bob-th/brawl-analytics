export interface BattlesList {
    items: Battle[]
}

export interface Battle {
    battleTime: string,
    event: Event,
    battle: BattleResult
}
export interface BattleResult {
    
    battleTime: string,
    mode: string,
    type: string,
    result: string,
    duration: number
    teams: Player[][]
}

export interface Player {
    tag: string,
    name: string,
    brawler: Brawler
}
export interface Brawler{
    id: number,
    name: string,
    power: number,
    trophies: number,
}


export interface Event {
    id: number,
    mode: string,
    map: string
}
