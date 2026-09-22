import type { Rank } from "./rank";

export type GuildClass =
  | "Frontend Mage"
  | "Backend Warrior"
  | "Fullstack Ranger"
  | "DevOps Alchemist";

export interface GuildCard {
  adventurerName: string;
  rank: Rank;
  currentXp: number;
  className: GuildClass;
  questsCompleted: number;
}
