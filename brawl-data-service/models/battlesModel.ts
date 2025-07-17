export interface BattlesList {
    items: Battle[]
}

export interface Battle {
    battle: BattleResult,
    battleTime: string,
    event: Event
}

export interface BattleResult {
    mode: string
}

export interface Event {
    id: number,
    mode: string,
    map: string
}