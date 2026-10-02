import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { HttpError, lockProfile, recordActivity } from "../lib/workflow";

export const shopRouter = Router();

shopRouter.get("/items", authMiddleware, async (req, res) => {
  const profileId = req.user?.profileId;
  if (!profileId) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const [items, ownedCosmetics, profile] = await Promise.all([
    prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { price: "asc" }],
    }),
    prisma.userCosmetic.findMany({
      where: { guildProfileId: profileId },
      select: { shopItemId: true },
    }),
    prisma.guildProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: {
        hqCoins: true,
        equippedTitle: true,
        equippedFrame: true,
        equippedBadge: true,
        equippedTheme: true,
      },
    }),
  ]);

  const ownedItemIds = new Set(ownedCosmetics.map((c) => c.shopItemId));

  const enrichedItems = items.map((item) => {
    const isOwned = ownedItemIds.has(item.id);
    let isEquipped = false;

    if (isOwned) {
      if (item.type === "title" && profile.equippedTitle === item.name) isEquipped = true;
      if (item.type === "frame" && profile.equippedFrame === item.code) isEquipped = true;
      if (item.type === "badge" && profile.equippedBadge === item.code) isEquipped = true;
      if (item.type === "theme" && profile.equippedTheme === item.code) isEquipped = true;
    }

    return {
      ...item,
      isOwned,
      isEquipped,
    };
  });

  return res.json({
    items: enrichedItems,
    hqCoins: profile.hqCoins,
    equipped: {
      title: profile.equippedTitle,
      frame: profile.equippedFrame,
      badge: profile.equippedBadge,
      theme: profile.equippedTheme,
    },
  });
});

shopRouter.post("/buy/:id", authMiddleware, async (req, res) => {
  const profileId = req.user?.profileId;
  if (!profileId) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const itemId = req.params.id;

  const result = await prisma.$transaction(
    async (tx) => {
      await lockProfile(tx, profileId);

      const item = await tx.shopItem.findUnique({
        where: { id: itemId },
      });
      if (!item || !item.isActive) {
        throw new HttpError(404, "Item cosmético não encontrado ou indisponível.");
      }

      const alreadyOwned = await tx.userCosmetic.findUnique({
        where: {
          guildProfileId_shopItemId: {
            guildProfileId: profileId,
            shopItemId: item.id,
          },
        },
      });
      if (alreadyOwned) {
        throw new HttpError(409, "Você já possui este item cosmético.");
      }

      const profile = await tx.guildProfile.findUniqueOrThrow({
        where: { id: profileId },
      });

      if (profile.hqCoins < item.price) {
        throw new HttpError(
          400,
          `Saldo insuficiente. Você possui ${profile.hqCoins} HQCoins e o item custa ${item.price} HQCoins.`,
        );
      }

      const updatedProfile = await tx.guildProfile.update({
        where: { id: profileId },
        data: { hqCoins: { decrement: item.price } },
      });

      await tx.coinTransaction.create({
        data: {
          guildProfileId: profileId,
          amount: -item.price,
          balanceAfter: updatedProfile.hqCoins,
          reason: "cosmetic_purchase",
          meta: {
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            itemType: item.type,
          },
        },
      });

      const cosmetic = await tx.userCosmetic.create({
        data: {
          guildProfileId: profileId,
          shopItemId: item.id,
        },
      });

      await recordActivity(tx, profileId, "cosmetic_purchased", {
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        price: item.price,
      });

      return {
        cosmetic,
        item,
        newBalance: updatedProfile.hqCoins,
      };
    },
    { timeout: 15000 },
  );

  return res.json({
    message: `Você adquiriu ${result.item.name}!`,
    ...result,
  });
});

shopRouter.post("/equip", authMiddleware, async (req, res) => {
  const profileId = req.user?.profileId;
  if (!profileId) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const schema = z.object({
    itemId: z.string(),
    unequip: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const { itemId, unequip } = parsed.data;

  const result = await prisma.$transaction(
    async (tx) => {
      await lockProfile(tx, profileId);

      const owned = await tx.userCosmetic.findUnique({
        where: {
          guildProfileId_shopItemId: {
            guildProfileId: profileId,
            shopItemId: itemId,
          },
        },
        include: { shopItem: true },
      });

      if (!owned) {
        throw new HttpError(403, "Você ainda não possui este cosmético.");
      }

      const item = owned.shopItem;
      const dataToUpdate: Record<string, string | null> = {};

      if (item.type === "title") {
        dataToUpdate.equippedTitle = unequip ? null : item.name;
      } else if (item.type === "frame") {
        dataToUpdate.equippedFrame = unequip ? null : item.code;
      } else if (item.type === "badge") {
        dataToUpdate.equippedBadge = unequip ? null : item.code;
      } else if (item.type === "theme") {
        dataToUpdate.equippedTheme = unequip ? null : item.code;
      }

      const updated = await tx.guildProfile.update({
        where: { id: profileId },
        data: dataToUpdate,
        select: {
          equippedTitle: true,
          equippedFrame: true,
          equippedBadge: true,
          equippedTheme: true,
        },
      });

      await recordActivity(tx, profileId, unequip ? "cosmetic_unequipped" : "cosmetic_equipped", {
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        type: item.type,
      });

      return updated;
    },
    { timeout: 15000 },
  );

  return res.json({
    equipped: result,
  });
});

shopRouter.get("/inventory", authMiddleware, async (req, res) => {
  const profileId = req.user?.profileId;
  if (!profileId) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const [cosmetics, profile] = await Promise.all([
    prisma.userCosmetic.findMany({
      where: { guildProfileId: profileId },
      include: { shopItem: true },
      orderBy: { acquiredAt: "desc" },
    }),
    prisma.guildProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: {
        hqCoins: true,
        equippedTitle: true,
        equippedFrame: true,
        equippedBadge: true,
        equippedTheme: true,
      },
    }),
  ]);

  return res.json({
    inventory: cosmetics.map((c) => ({
      ...c.shopItem,
      acquiredAt: c.acquiredAt,
      isEquipped:
        (c.shopItem.type === "title" && profile.equippedTitle === c.shopItem.name) ||
        (c.shopItem.type === "frame" && profile.equippedFrame === c.shopItem.code) ||
        (c.shopItem.type === "badge" && profile.equippedBadge === c.shopItem.code) ||
        (c.shopItem.type === "theme" && profile.equippedTheme === c.shopItem.code),
    })),
    hqCoins: profile.hqCoins,
    equipped: {
      title: profile.equippedTitle,
      frame: profile.equippedFrame,
      badge: profile.equippedBadge,
      theme: profile.equippedTheme,
    },
  });
});
