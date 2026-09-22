import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token ausente ou inválido." });
  let userId: string;
  try {
    const decoded = verifyToken(header.slice(7)) as { userId: string };
    if (!decoded.userId) throw new Error("Invalid payload");
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
  }
  // Roles and ownership come from the database, so revoked permissions take effect immediately.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, guildProfile: { select: { id: true } } },
  });
  if (!user?.guildProfile)
    return res.status(401).json({ error: "Usuário não encontrado." });
  req.user = {
    userId: user.id,
    role: user.role,
    profileId: user.guildProfile.id,
  };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "Permissão insuficiente." });
    next();
  };
}
