import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { HttpError, recordActivity } from "../lib/workflow";

export const projectsRouter = Router();
export const journalRouter = Router();
export const tavernRouter = Router();
for (const router of [projectsRouter, journalRouter, tavernRouter])
  router.use(authMiddleware);

const pagination = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  q: z.string().trim().max(100).default(""),
});
const pageSize = 20;
const author = {
  id: true,
  adventurerName: true,
  avatarUrl: true,
  rank: true,
} as const;
const projectStatus = z.enum(["idea", "active", "completed", "archived"]);
const projectSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(5000),
  repoUrl: z
    .union([z.url({ protocol: /^https?$/ }), z.literal("")])
    .optional()
    .transform((value) => value || null),
  status: projectStatus.default("idea"),
});
const projectInclude = {
  createdBy: { select: author },
  members: {
    include: { guildProfile: { select: author } },
    orderBy: { joinedAt: "asc" as const },
  },
};

projectsRouter.get("/", async (req, res) => {
  const { page, q, status, mine } = pagination
    .extend({
      status: projectStatus.optional(),
      mine: z.enum(["true", "false"]).optional(),
    })
    .parse(req.query);
  const projects = await prisma.project.findMany({
    where: {
      status,
      ...(mine === "true"
        ? {
            OR: [
              { createdByGuildProfileId: req.user!.profileId },
              { members: { some: { guildProfileId: req.user!.profileId } } },
            ],
          }
        : {}),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          }
        : {}),
    },
    include: {
      createdBy: { select: author },
      _count: { select: { members: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  res.json({
    projects: projects.slice(0, pageSize),
    hasMore: projects.length > pageSize,
    page,
  });
});

projectsRouter.post("/", async (req, res) => {
  const data = projectSchema.parse(req.body);
  const project = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        ...data,
        createdByGuildProfileId: req.user!.profileId!,
        members: {
          create: { guildProfileId: req.user!.profileId!, role: "owner" },
        },
      },
    });
    await recordActivity(tx, req.user!.profileId!, "project_created", {
      projectId: project.id,
      title: project.name,
    });
    return project;
  });
  res.status(201).json({ project });
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: projectInclude,
  });
  if (!project) throw new HttpError(404, "Projeto não encontrado.");
  res.json({ project });
});

projectsRouter.put("/:id", async (req, res) => {
  const data = projectSchema.parse(req.body);
  const project = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${req.params.id} FOR UPDATE`;
    const old = await tx.project.findUnique({ where: { id: req.params.id } });
    if (!old) throw new HttpError(404, "Projeto não encontrado.");
    if (old.createdByGuildProfileId !== req.user!.profileId)
      throw new HttpError(403, "Somente o criador pode editar este projeto.");
    const project = await tx.project.update({
      where: { id: old.id },
      data,
      include: projectInclude,
    });
    await recordActivity(tx, req.user!.profileId!, "project_updated", {
      projectId: old.id,
      title: project.name,
      status: project.status,
    });
    return project;
  });
  res.json({ project });
});

projectsRouter.delete("/:id", async (req, res) => {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${req.params.id} FOR UPDATE`;
    const project = await tx.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado.");
    if (project.createdByGuildProfileId !== req.user!.profileId)
      throw new HttpError(403, "Somente o criador pode excluir este projeto.");
    await tx.projectMember.deleteMany({ where: { projectId: project.id } });
    await tx.bugFixLog.updateMany({
      where: { relatedProjectId: project.id },
      data: { relatedProjectId: null },
    });
    await tx.project.delete({ where: { id: project.id } });
    await recordActivity(tx, req.user!.profileId!, "project_deleted", {
      title: project.name,
    });
  });
  res.json({ success: true });
});

projectsRouter.post("/:id/join", async (req, res) => {
  const member = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${req.params.id} FOR UPDATE`;
    const project = await tx.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado.");
    if (!["idea", "active"].includes(project.status))
      throw new HttpError(
        409,
        "Este projeto não está recebendo participantes.",
      );
    const key = { projectId: project.id, guildProfileId: req.user!.profileId! };
    const existing = await tx.projectMember.findUnique({
      where: { projectId_guildProfileId: key },
    });
    if (existing) return existing;
    const member = await tx.projectMember.create({
      data: {
        ...key,
        role:
          project.createdByGuildProfileId === req.user!.profileId
            ? "owner"
            : "contributor",
      },
    });
    await recordActivity(tx, req.user!.profileId!, "project_joined", {
      projectId: project.id,
      title: project.name,
    });
    return member;
  });
  res.json({ member });
});

projectsRouter.delete("/:id/members/:profileId", async (req, res) => {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${req.params.id} FOR UPDATE`;
    const project = await tx.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado.");
    if (req.params.profileId === project.createdByGuildProfileId)
      throw new HttpError(409, "O criador deve permanecer na equipe.");
    if (
      req.user!.profileId !== req.params.profileId &&
      req.user!.profileId !== project.createdByGuildProfileId
    )
      throw new HttpError(403, "Você não pode remover este participante.");
    const result = await tx.projectMember.deleteMany({
      where: { projectId: project.id, guildProfileId: req.params.profileId },
    });
    if (!result.count) throw new HttpError(404, "Participante não encontrado.");
    await recordActivity(tx, req.user!.profileId!, "project_member_removed", {
      projectId: project.id,
      title: project.name,
      targetProfileId: req.params.profileId,
    });
  });
  res.json({ success: true });
});

const journalSchema = z.object({
  title: z.string().trim().min(3).max(150),
  content: z.string().trim().min(1).max(20000),
  weekReference: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .transform((value) => (value ? new Date(`${value}T12:00:00Z`) : null)),
});

journalRouter.get("/", async (req, res) => {
  const { page, q } = pagination.parse(req.query);
  const entries = await prisma.journalEntry.findMany({
    where: {
      guildProfileId: req.user!.profileId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  res.json({
    entries: entries.slice(0, pageSize),
    hasMore: entries.length > pageSize,
    page,
  });
});

journalRouter.post("/", async (req, res) => {
  const data = journalSchema.parse(req.body);
  const entry = await prisma.journalEntry.create({
    data: { ...data, guildProfileId: req.user!.profileId! },
  });
  res.status(201).json({ entry });
});

journalRouter.put("/:id", async (req, res) => {
  const data = journalSchema.parse(req.body);
  const entry = await prisma.journalEntry.update({
    where: { id: req.params.id, guildProfileId: req.user!.profileId! },
    data,
  });
  res.json({ entry });
});

journalRouter.delete("/:id", async (req, res) => {
  await prisma.journalEntry.delete({
    where: { id: req.params.id, guildProfileId: req.user!.profileId! },
  });
  res.json({ success: true });
});

const messageSchema = z.object({ content: z.string().trim().min(1).max(2000) });
const messageInclude = {
  guildProfile: { select: author },
  replyTo: {
    select: { id: true, content: true, guildProfile: { select: author } },
  },
};

tavernRouter.get("/", async (req, res) => {
  const { page, q } = pagination.parse(req.query);
  const messages = await prisma.tavernMessage.findMany({
    where: q ? { content: { contains: q, mode: "insensitive" } } : {},
    include: messageInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  res.json({
    messages: messages.slice(0, pageSize),
    hasMore: messages.length > pageSize,
    page,
  });
});

tavernRouter.post("/", async (req, res) => {
  const data = messageSchema
    .extend({ replyToMessageId: z.string().min(1).optional() })
    .parse(req.body);
  const message = await prisma.$transaction(async (tx) => {
    if (data.replyToMessageId) {
      await tx.$queryRaw`SELECT id FROM "TavernMessage" WHERE id = ${data.replyToMessageId} FOR SHARE`;
      if (
        !(await tx.tavernMessage.findUnique({
          where: { id: data.replyToMessageId },
        }))
      )
        throw new HttpError(
          404,
          "A mensagem original não está mais disponível.",
        );
    }
    return tx.tavernMessage.create({
      data: { ...data, guildProfileId: req.user!.profileId! },
      include: messageInclude,
    });
  });
  res.status(201).json({ message });
});

tavernRouter.put("/:id", async (req, res) => {
  const data = messageSchema.parse(req.body);
  const message = await prisma.tavernMessage.update({
    where: { id: req.params.id, guildProfileId: req.user!.profileId! },
    data,
    include: messageInclude,
  });
  res.json({ message });
});

tavernRouter.delete("/:id", async (req, res) => {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TavernMessage" WHERE id = ${req.params.id} FOR UPDATE`;
    const message = await tx.tavernMessage.findUnique({
      where: { id: req.params.id },
    });
    if (!message) throw new HttpError(404, "Mensagem não encontrada.");
    if (
      message.guildProfileId !== req.user!.profileId &&
      req.user!.role !== "admin"
    )
      throw new HttpError(403, "Você não pode excluir esta mensagem.");
    await tx.tavernMessage.updateMany({
      where: { replyToMessageId: message.id },
      data: { replyToMessageId: null },
    });
    await tx.tavernMessage.delete({ where: { id: message.id } });
    if (message.guildProfileId !== req.user!.profileId)
      await recordActivity(tx, req.user!.profileId!, "tavern_moderated", {
        targetProfileId: message.guildProfileId,
        messageId: message.id,
        actorId: req.user!.userId,
      });
  });
  res.json({ success: true });
});
