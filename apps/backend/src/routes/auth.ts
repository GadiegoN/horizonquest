import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/hash.js";
import { generateToken } from "../lib/jwt.js";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";

import { calculateRank, nextRankXp } from "../lib/xp";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const schema = z.object({
    email: z.email(),
    password: z.string().min(6),
    adventurerName: z.string().min(3),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { email, password, adventurerName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email já registrado" });

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      guildProfile: {
        create: {
          adventurerName,
        },
      },
    },
    include: {
      guildProfile: true,
    },
  });

  const token = generateToken({
    userId: user.id,
    profileId: user.guildProfile?.id,
    role: user.role,
  });

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

authRouter.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.email(),
    password: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { guildProfile: true },
  });

  if (!user) return res.status(400).json({ error: "Credenciais inválidas" });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Credenciais inválidas" });

  const token = generateToken({
    userId: user.id,
    profileId: user.guildProfile?.id,
    role: user.role,
  });

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      guildProfile: {
        include: {
          class: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      guildProfile: user.guildProfile
        ? {
            ...user.guildProfile,
            nextRankXp: nextRankXp(calculateRank(user.guildProfile.currentXp)),
            className: user.guildProfile.class?.name ?? null, // <-- AQUI
          }
        : null,
    },
  });
});
