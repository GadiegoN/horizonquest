import { auditMutation } from "../lib/workflow";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth";
import { z } from "zod";

export const classesRouter = Router();

classesRouter.get("/", authMiddleware, async (_req, res) => {
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
  });

  return res.json({ classes });
});

classesRouter.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const { name, description } = parsed.data;

    try {
      const newClass = await auditMutation(
        req.user!.profileId!,
        req.user!.userId,
        "class_create",
        (tx) =>
          tx.class.create({
            data: { name, description },
          }),
      );

      return res.json({ class: newClass });
    } catch (err: any) {
      if (err.code === "P2002") {
        return res
          .status(400)
          .json({ error: "Já existe uma classe com esse nome." });
      }

      return res
        .status(500)
        .json({ error: "Não foi possível concluir a operação." });
    }
  },
);

classesRouter.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;

    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const updated = await auditMutation(
        req.user!.profileId!,
        req.user!.userId,
        "class_update",
        (tx) =>
          tx.class.update({
            where: { id },
            data: parsed.data,
          }),
      );

      return res.json({ class: updated });
    } catch (err: any) {
      if (err.code === "P2003")
        return res
          .status(409)
          .json({
            error: "Esta classe possui aventureiros e não pode ser excluída.",
          });
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Classe não encontrada." });
      }
      return res
        .status(500)
        .json({ error: "Não foi possível concluir a operação." });
    }
  },
);

classesRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;

    try {
      await auditMutation(
        req.user!.profileId!,
        req.user!.userId,
        "class_delete",
        (tx) =>
          tx.class.delete({
            where: { id },
          }),
      );

      return res.json({ success: true });
    } catch (err: any) {
      if (err.code === "P2003")
        return res
          .status(409)
          .json({
            error: "Esta classe possui aventureiros e não pode ser excluída.",
          });
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Classe não encontrada." });
      }
      return res
        .status(500)
        .json({ error: "Não foi possível concluir a operação." });
    }
  },
);
