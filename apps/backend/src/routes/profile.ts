import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth";
import {
  HttpError,
  lockProfile,
  awardXp,
  unlockAchievements,
  recordActivity,
} from "../lib/workflow";
import { calculateRank, nextRankXp } from "../lib/xp";
import { z } from "zod";

export const profileRouter = Router();

profileRouter.get("/me", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      guildProfile: {
        include: {
          class: true,
          quests: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  const questsCompleted =
    user.guildProfile?.quests.filter((q) => q.status === "completed").length ??
    0;

  return res.json({
    profile: {
      id: user.guildProfile?.id,
      adventurerName: user.guildProfile?.adventurerName,
      rank: user.guildProfile?.rank,
      currentXp: user.guildProfile?.currentXp,
      nextRankXp: user.guildProfile
        ? nextRankXp(calculateRank(user.guildProfile.currentXp))
        : null,

      classId: user.guildProfile?.classId,
      className: user.guildProfile?.class?.name ?? null,

      avatarUrl: user.guildProfile?.avatarUrl,
      bio: user.guildProfile?.bio,
      questsCompleted,
    },
  });
});

profileRouter.put("/update", authMiddleware, async (req, res) => {
  const profileId = req.user!.profileId!;
  const data = z
    .object({
      adventurerName: z.string().trim().min(3).max(80),
      classId: z
        .string()
        .optional()
        .nullable()
        .transform((v) => v || null),
      avatarUrl: z
        .union([z.url({ protocol: /^https?$/ }), z.literal("")])
        .optional()
        .nullable()
        .transform((v) => v || null),
      bio: z.string().trim().max(300).optional().nullable(),
    })
    .parse(req.body);
  const result = await prisma.$transaction(
    async (tx) => {
      await lockProfile(tx, profileId);
      const old = await tx.guildProfile.findUniqueOrThrow({
        where: { id: profileId },
      });
      if (
        data.classId &&
        !(await tx.class.findUnique({ where: { id: data.classId } }))
      )
        throw new HttpError(400, "Classe inválida.");
      const alreadyRewarded = await tx.xpTransaction.findFirst({
        where: { guildProfileId: profileId, reason: "profile_completed" },
      });
      const achievement = await tx.userAchievement.findFirst({
        where: {
          guildProfileId: profileId,
          achievement: { code: "first_quest" },
        },
      });
      if (old.classId && old.avatarUrl && old.bio && !alreadyRewarded) {
        // Preserve the reward marker for complete profiles from the legacy app.
        await tx.xpTransaction.create({
          data: {
            guildProfileId: profileId,
            amount: 0,
            reason: "profile_completed",
            meta: { legacy: true },
          },
        });
        await unlockAchievements(tx, profileId);
      }
      const updated = await tx.guildProfile.update({
        where: { id: profileId },
        data,
      });
      const complete =
        !!updated.classId && !!updated.avatarUrl && !!updated.bio;
      const wasComplete = !!old.classId && !!old.avatarUrl && !!old.bio;
      const xpGained =
        complete && !wasComplete && !alreadyRewarded && !achievement ? 30 : 0;
      if (xpGained)
        await awardXp(tx, profileId, xpGained, "profile_completed", {});
      await recordActivity(
        tx,
        profileId,
        xpGained ? "profile_completed" : "profile_updated",
        { xp: xpGained, actorId: req.user!.userId },
      );
      await unlockAchievements(tx, profileId);
      const profile = await tx.guildProfile.findUniqueOrThrow({
        where: { id: profileId },
        include: { class: true },
      });
      return {
        profile: {
          ...profile,
          className: profile.class?.name ?? null,
          nextRankXp: nextRankXp(calculateRank(profile.currentXp)),
        },
        xpGained,
      };
    },
    { timeout: 15000 },
  );
  res.json(result);
});

// XP is granted exclusively by validated domain operations.
profileRouter.post("/xp/add", authMiddleware, (_req, res) => {
  res
    .status(403)
    .json({
      error:
        "XP só pode ser concedido pela conclusão de perfil ou aprovação de quests.",
    });
});

/* -------------------- GET /profile/stats -------------------- */
profileRouter.get("/stats", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;

  const profile = await prisma.guildProfile.findUnique({
    where: { userId },
    include: {
      quests: true,
      achievements: true,
    },
  });

  if (!profile) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const totalQuestsCompleted = profile.quests.filter(
    (q) => q.status === "completed",
  ).length;

  const totalAchievements = profile.achievements.length;

  return res.json({
    totalQuestsCompleted,
    totalAchievements,
    totalXp: profile.currentXp,
  });
});

profileRouter.get("/achievements", authMiddleware, async (req, res) => {
  const profileId = req.user?.profileId;

  if (!profileId) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  await prisma.$transaction(
    async (tx) => {
      await lockProfile(tx, profileId);
      await unlockAchievements(tx, profileId);
    },
    { timeout: 15000 },
  );

  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { name: "asc" } }),
    prisma.userAchievement.findMany({
      where: { guildProfileId: profileId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
  ]);

  const unlockedById = new Map(
    unlocked.map((entry) => [entry.achievementId, entry.unlockedAt]),
  );

  return res.json({
    achievements: achievements.map((achievement) => ({
      ...achievement,
      unlockedAt: unlockedById.get(achievement.id) ?? null,
      unlocked: unlockedById.has(achievement.id),
    })),
  });
});

profileRouter.get("/activity", authMiddleware, async (req, res) => {
  const profileId = req.user?.profileId;

  if (!profileId) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const activities = await prisma.activityLog.findMany({
    where: { guildProfileId: profileId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.json({ activities });
});

profileRouter.get("/ranking", authMiddleware, async (_req, res) => {
  const ranking = await prisma.guildProfile.findMany({
    select: {
      id: true,
      adventurerName: true,
      currentXp: true,
      rank: true,
      avatarUrl: true,
      class: { select: { name: true } },
    },
    orderBy: [{ currentXp: "desc" }, { adventurerName: "asc" }, { id: "asc" }],
    take: 100,
  });

  return res.json({
    ranking: ranking.map((profile, index) => ({
      position: index + 1,
      ...profile,
      className: profile.class?.name ?? null,
      class: undefined,
    })),
  });
});

profileRouter.get(
  "/audit",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { type } = z.object({ type: z.string().optional() }).parse(req.query);
    const activities = await prisma.activityLog.findMany({
      where: { type: type || undefined },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      include: { guildProfile: { select: { adventurerName: true } } },
    });
    res.json({ activities });
  },
);
