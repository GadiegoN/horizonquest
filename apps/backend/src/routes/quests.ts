import { auditMutation } from "../lib/workflow";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth";
import { z } from "zod";
import {
  HttpError,
  lockProfile,
  awardXp,
  awardCoins,
  unlockAchievements,
  recordActivity,
} from "../lib/workflow";

export const questsRouter = Router();

questsRouter.get("/templates", authMiddleware, async (req, res) => {
  const templates = await prisma.questTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ templates });
});

const templateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(20000),
  type: z.string().trim().min(1).max(80),
  difficulty: z.string().trim().min(1).max(80),
  baseXpReward: z.number().int().min(1).max(100000),
  isActive: z.boolean().optional(),
});

questsRouter.post(
  "/templates",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const data = templateSchema.parse(req.body);
    const template = await auditMutation(
      req.user!.profileId!,
      req.user!.userId,
      "questTemplate_create",
      (tx) =>
        tx.questTemplate.create({
          data: { ...data, createdByUserId: req.user!.userId },
        }),
    );
    res.json({ template });
  },
);

questsRouter.put(
  "/templates/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const data = templateSchema.parse(req.body);
    const template = await auditMutation(
      req.user!.profileId!,
      req.user!.userId,
      "questTemplate_update",
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "QuestTemplate" WHERE id = ${req.params.id} FOR UPDATE`;
        const current = await tx.questTemplate.findUnique({
          where: { id: req.params.id },
        });
        if (!current) throw new HttpError(404, "Template não encontrado.");
        if (!current.isActive)
          throw new HttpError(400, "Ative o template antes de editá-lo.");
        if (
          await tx.questInstance.count({
            where: { questTemplateId: current.id },
          })
        )
          throw new HttpError(
            400,
            "Este template já possui instâncias e não pode ser editado.",
          );
        return tx.questTemplate.update({ where: { id: current.id }, data });
      },
    );
    res.json({ template });
  },
);

questsRouter.patch(
  "/templates/:id/toggle",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const template = await auditMutation(
      req.user!.profileId!,
      req.user!.userId,
      "questTemplate_update",
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "QuestTemplate" WHERE id = ${req.params.id} FOR UPDATE`;
        const current = await tx.questTemplate.findUnique({
          where: { id: req.params.id },
        });
        if (!current) throw new HttpError(404, "Template não encontrado.");
        return tx.questTemplate.update({
          where: { id: current.id },
          data: { isActive: !current.isActive },
        });
      },
    );
    res.json({ template });
  },
);

questsRouter.delete(
  "/templates/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "QuestTemplate" WHERE id = ${req.params.id} FOR UPDATE`;
      const current = await tx.questTemplate.findUnique({
        where: { id: req.params.id },
      });
      if (!current) throw new HttpError(404, "Template não encontrado.");
      const count = await tx.questInstance.count({
        where: { questTemplateId: current.id },
      });
      const template = count
        ? await tx.questTemplate.update({
            where: { id: current.id },
            data: { isActive: false },
          })
        : await tx.questTemplate.delete({ where: { id: current.id } });
      await recordActivity(tx, req.user!.profileId!, "questTemplate_delete", {
        actorId: req.user!.userId,
        resourceId: current.id,
        title: current.title,
        softDelete: count > 0,
      });
      return {
        deleted: count === 0,
        template,
        message: count
          ? "Template desativado. As quests existentes foram preservadas."
          : "Template excluído.",
      };
    });
    res.json(result);
  },
);

questsRouter.get(
  "/templates/all",
  authMiddleware,
  requireRole("admin"),
  async (_req, res) => {
    const templates = await prisma.questTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, email: true } },
        _count: { select: { instances: true } },
      },
    });
    res.json({ templates });
  },
);

const submissionSchema = z
  .object({
    repoUrl: z
      .union([z.url({ protocol: /^https?$/ }), z.literal("")])
      .optional()
      .transform((v) => v || null),
    liveDemoUrl: z
      .union([z.url({ protocol: /^https?$/ }), z.literal("")])
      .optional()
      .transform((v) => v || null),
    notes: z.string().trim().max(10000).optional(),
  })
  .refine((v) => v.repoUrl || v.liveDemoUrl || v.notes, {
    message: "Informe um repositório, demo ou observações.",
  });

questsRouter.post("/start/:templateId", authMiddleware, async (req, res) => {
  const profileId = req.user!.profileId!;
  const instance = await prisma.$transaction(async (tx) => {
    await lockProfile(tx, profileId);
    await tx.$queryRaw`SELECT id FROM "QuestTemplate" WHERE id = ${req.params.templateId} FOR SHARE`;
    const template = await tx.questTemplate.findUnique({
      where: { id: req.params.templateId },
    });
    if (!template) throw new HttpError(404, "Template não encontrado.");
    if (!template.isActive)
      throw new HttpError(400, "Esta quest está desativada.");
    const active = await tx.questInstance.findFirst({
      where: {
        guildProfileId: profileId,
        status: { in: ["in_progress", "submitted"] },
      },
    });
    if (active)
      throw new HttpError(
        409,
        "Você já possui uma quest em andamento. Conclua ou cancele antes de iniciar outra.",
      );
    const instance = await tx.questInstance.create({
      data: {
        questTemplateId: template.id,
        guildProfileId: profileId,
        status: "in_progress",
        startedAt: new Date(),
      },
    });
    await recordActivity(tx, profileId, "quest_started", {
      instanceId: instance.id,
      title: template.title,
      actorId: req.user!.userId,
    });
    return instance;
  });
  res.json({ instance });
});

for (const action of ["submit", "resubmit", "cancel"] as const) {
  questsRouter.post(
    `/${action}/:instanceId`,
    authMiddleware,
    async (req, res) => {
      const data =
        action === "cancel" ? null : submissionSchema.parse(req.body);
      const profileId = req.user!.profileId!;
      const instance = await prisma.$transaction(async (tx) => {
        await lockProfile(tx, profileId);
        const current = await tx.questInstance.findUnique({
          where: { id: req.params.instanceId },
          include: { questTemplate: true },
        });
        if (!current) throw new HttpError(404, "Quest não encontrada.");
        if (current.guildProfileId !== profileId)
          throw new HttpError(
            403,
            "Você não pode alterar a quest de outro jogador.",
          );
        const allowed =
          action === "resubmit"
            ? ["rejected"]
            : action === "cancel"
              ? ["in_progress", "rejected"]
              : ["in_progress"];
        if (!allowed.includes(current.status))
          throw new HttpError(409, "O status atual não permite esta operação.");
        if (action === "resubmit") {
          const active = await tx.questInstance.findFirst({
            where: {
              guildProfileId: profileId,
              id: { not: current.id },
              status: { in: ["in_progress", "submitted"] },
            },
          });
          if (active)
            throw new HttpError(
              409,
              "Conclua ou cancele a quest ativa antes de reenviar esta submissão.",
            );
        }
        const instance = await tx.questInstance.update({
          where: { id: current.id },
          data:
            action === "cancel"
              ? { status: "canceled" }
              : {
                  status: "submitted",
                  submittedAt: new Date(),
                  reviewerId: null,
                  reviewComment: null,
                  submission: { upsert: { create: data!, update: data! } },
                },
          include: { questTemplate: true, submission: true },
        });
        await recordActivity(
          tx,
          profileId,
          action === "cancel"
            ? "quest_canceled"
            : action === "resubmit"
              ? "quest_resubmitted"
              : "quest_submitted",
          {
            instanceId: instance.id,
            title: current.questTemplate.title,
            actorId: req.user!.userId,
          },
        );
        return instance;
      });
      res.json({ instance });
    },
  );
}

questsRouter.get("/my", authMiddleware, async (req, res) => {
  const instances = await prisma.questInstance.findMany({
    where: { guildProfileId: req.user!.profileId },
    include: { questTemplate: true, submission: true },
    orderBy: { startedAt: "desc" },
  });
  res.json({ instances });
});

questsRouter.post(
  "/review/:instanceId",
  authMiddleware,
  requireRole("reviewer", "admin"),
  async (req, res) => {
    const { approved, reviewComment } = z
      .object({
        approved: z.boolean(),
        reviewComment: z.string().trim().max(5000).optional(),
      })
      .refine((v) => v.approved || v.reviewComment, {
        message: "Explique os ajustes necessórios ao rejeitar uma quest.",
      })
      .parse(req.body);
    const result = await prisma.$transaction(
      async (tx) => {
        const initial = await tx.questInstance.findUnique({
          where: { id: req.params.instanceId },
        });
        if (!initial) throw new HttpError(404, "Quest não encontrada.");
        if (initial.guildProfileId === req.user!.profileId)
          throw new HttpError(
            403,
            "Você não pode revisar a sua própria quest.",
          );
        await lockProfile(tx, initial.guildProfileId);
        const current = await tx.questInstance.findUniqueOrThrow({
          where: { id: initial.id },
          include: { questTemplate: true },
        });
        if (current.status !== "submitted")
          throw new HttpError(
            409,
            "A quest já foi revisada ou não está submetida.",
          );
        const xpGained = approved ? current.questTemplate.baseXpReward : 0;
        const meta = {
          instanceId: current.id,
          templateId: current.questTemplateId,
          title: current.questTemplate.title,
          actorId: req.user!.userId,
          reviewComment: reviewComment ?? "",
          xp: xpGained,
        };
        const instance = await tx.questInstance.update({
          where: { id: current.id },
          data: {
            status: approved ? "completed" : "rejected",
            completedAt: approved ? new Date() : null,
            reviewerId: req.user!.userId,
            reviewComment,
          },
          include: { submission: true },
        });
        const coinsGained = approved
          ? Math.max(10, Math.floor(current.questTemplate.baseXpReward / 2))
          : 0;
        const profile = approved
          ? await awardXp(
              tx,
              current.guildProfileId,
              xpGained,
              "quest_completed",
              meta,
            )
          : null;
        if (approved && coinsGained > 0) {
          await awardCoins(
            tx,
            current.guildProfileId,
            coinsGained,
            "quest_completed",
            { ...meta, coins: coinsGained },
          );
        }
        await recordActivity(
          tx,
          current.guildProfileId,
          approved ? "quest_completed" : "quest_rejected",
          meta,
        );
        await recordActivity(tx, req.user!.profileId!, "review_performed", {
          ...meta,
          approved,
          targetProfileId: current.guildProfileId,
        });
        await unlockAchievements(tx, current.guildProfileId);
        return { instance, xpGained, coinsGained, newXp: profile?.currentXp };
      },
      { timeout: 15000 },
    );
    res.json(result);
  },
);

questsRouter.get(
  "/review/pending",
  authMiddleware,
  requireRole("reviewer", "admin"),
  async (req, res) => {
    const filters = z
      .object({
        classId: z.string().optional(),
        difficulty: z.string().optional(),
        type: z.string().optional(),
      })
      .parse(req.query);
    const instances = await prisma.questInstance.findMany({
      where: {
        status: "submitted",
        guildProfileId: { not: req.user!.profileId },
        guildProfile: filters.classId
          ? { classId: filters.classId }
          : undefined,
        questTemplate: {
          difficulty: filters.difficulty || undefined,
          type: filters.type || undefined,
        },
      },
      include: {
        questTemplate: true,
        submission: true,
        guildProfile: {
          select: {
            id: true,
            adventurerName: true,
            class: { select: { id: true, name: true } },
            user: { select: { email: true } },
          },
        },
      },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    });
    res.json({ instances });
  },
);

questsRouter.get("/instance/:id", authMiddleware, async (req, res) => {
  const instance = await prisma.questInstance.findUnique({
    where: { id: req.params.id },
    include: {
      questTemplate: true,
      submission: true,
      reviewer: { select: { id: true, email: true } },
      guildProfile: { select: { id: true, adventurerName: true } },
    },
  });
  if (!instance) throw new HttpError(404, "Quest não encontrada.");
  const owner = instance.guildProfileId === req.user!.profileId;
  const reviewer =
    ["admin", "reviewer"].includes(req.user!.role) &&
    (instance.status === "submitted" ||
      instance.reviewerId === req.user!.userId);
  if (!owner && !reviewer)
    throw new HttpError(
      403,
      "Você não tem permissão para visualizar esta instância.",
    );
  const progress =
    (
      {
        in_progress: 33,
        submitted: 66,
        rejected: 66,
        completed: 100,
      } as Record<string, number>
    )[instance.status] ?? 0;
  res.json({ instance: { ...instance, progress } });
});
