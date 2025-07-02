export interface Brawler {
  id: number;
  name: string;
  power: number;
  trophies: number;
}

export interface BrawlerList {
    items: Brawler[]
}