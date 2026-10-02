import type { Rank } from "./rank";

export type GuildClass =
  | "Frontend Mage"
  | "Backend Warrior"
  | "Fullstack Ranger"
  | "DevOps Alchemist";

export type CosmeticType = "title" | "frame" | "badge" | "theme";
export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

export interface ShopItemData {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CosmeticType;
  price: number;
  icon?: string | null;
  rarity: CosmeticRarity;
  config?: Record<string, unknown> | null;
  isActive: boolean;
  isOwned?: boolean;
  isEquipped?: boolean;
}

export interface GuildCard {
  adventurerName: string;
  rank: Rank;
  currentXp: number;
  className: GuildClass;
  questsCompleted: number;
  hqCoins?: number;
  equippedTitle?: string | null;
  equippedFrame?: string | null;
  equippedBadge?: string | null;
  equippedTheme?: string | null;
}
