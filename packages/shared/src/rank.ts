export const rankXpMap = {
  D: 0,
  C: 100,
  B: 250,
  A: 500,
  S: 1000,
  SS: 2000,
  SSS: 3500,
} as const;

export const rankOrder = ["D", "C", "B", "A", "S", "SS", "SSS"] as const;
export type Rank = (typeof rankOrder)[number];

export function calculateRank(xp: number): Rank {
  let currentRank: Rank = "D";

  for (const rank of rankOrder) {
    if (xp >= rankXpMap[rank]) currentRank = rank;
    else break;
  }

  return currentRank;
}

export function nextRankXp(rank: Rank) {
  const index = rankOrder.indexOf(rank);
  return rankOrder[index + 1] ? rankXpMap[rankOrder[index + 1]] : null;
}
