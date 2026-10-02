import type { Prisma } from "@prisma/client";
import { calculateRank } from "@horizon/shared";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Every operation on a player's quest/XP takes this lock first. Concurrent
// reviews and starts then observe the committed state of the previous action.
export async function lockProfile(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "GuildProfile" WHERE id = ${id} FOR UPDATE`;
}

export async function recordActivity(
  tx: Prisma.TransactionClient,
  profileId: string,
  type: string,
  meta: Prisma.InputJsonObject = {},
) {
  return tx.activityLog.create({
    data: { guildProfileId: profileId, type, meta },
  });
}

export async function unlockAchievements(
  tx: Prisma.TransactionClient,
  profileId: string,
) {
  const profile = await tx.guildProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: { quests: { include: { questTemplate: true } } },
  });
  const completed = profile.quests.filter((q) => q.status === "completed");
  const codes: string[] = [];
  if (profile.classId && profile.avatarUrl && profile.bio)
    codes.push("first_quest");
  if (completed.length >= 5) codes.push("five_quests");
  if (completed.some((q) => q.questTemplate.difficulty === "silver"))
    codes.push("first_silver_quest");
  if (completed.some((q) => q.questTemplate.difficulty === "gold"))
    codes.push("first_gold_quest");
  if (profile.quests.some((q) => q.status === "rejected"))
    codes.push("first_rejection");
  for (const xp of [100, 500, 1000])
    if (profile.currentXp >= xp) codes.push(`xp_${xp}`);
  const achievements = await tx.achievement.findMany({
    where: { code: { in: codes } },
  });
  for (const achievement of achievements) {
    const result = await tx.userAchievement.createMany({
      data: [{ guildProfileId: profileId, achievementId: achievement.id }],
      skipDuplicates: true,
    });
    if (result.count)
      await recordActivity(tx, profileId, "achievement_unlocked", {
        name: achievement.name,
        code: achievement.code,
      });
  }
}

export async function awardXp(
  tx: Prisma.TransactionClient,
  profileId: string,
  amount: number,
  reason: string,
  meta: Prisma.InputJsonObject,
) {
  const profile = await tx.guildProfile.update({
    where: { id: profileId },
    data: { currentXp: { increment: amount } },
  });
  const updated = await tx.guildProfile.update({
    where: { id: profileId },
    data: { rank: calculateRank(profile.currentXp) },
  });
  await tx.xpTransaction.create({
    data: { guildProfileId: profileId, amount, reason, meta },
  });
  return updated;
}

export async function awardCoins(
  tx: Prisma.TransactionClient,
  profileId: string,
  amount: number,
  reason: string,
  meta: Prisma.InputJsonObject = {},
) {
  const profile = await tx.guildProfile.update({
    where: { id: profileId },
    data: { hqCoins: { increment: amount } },
  });
  await tx.coinTransaction.create({
    data: {
      guildProfileId: profileId,
      amount,
      balanceAfter: profile.hqCoins,
      reason,
      meta,
    },
  });
  return profile;
}

export async function auditMutation<T extends { id: string }>(
  profileId: string,
  actorId: string,
  type: string,
  mutate: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const { prisma } = await import("./prisma");
  return prisma.$transaction(async (tx) => {
    const result = await mutate(tx);
    await recordActivity(tx, profileId, type, {
      actorId,
      resourceId: result.id,
      result: JSON.parse(JSON.stringify(result)),
    });
    return result;
  });
}
