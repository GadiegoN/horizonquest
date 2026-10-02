import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";

process.env.NODE_ENV = "test";

test("shop, HQCoins economy and cosmetic equipment", { timeout: 180000 }, async (t) => {
  const { app } = await import("../src/server");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const suffix = randomUUID();
  const users: string[] = [];

  async function request(
    path: string,
    token?: string,
    body?: unknown,
    method = body === undefined ? "GET" : "POST",
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: (await response.json()) as any };
  }

  async function account(name: string) {
    const result = await request("/auth/register", undefined, {
      email: `shop-${name}-${suffix}@example.test`,
      password: "Test-only-password-123",
      adventurerName: `ShopHero ${name}`,
    });
    assert.equal(result.status, 200);
    users.push(result.data.user.id);
    return {
      token: result.data.token as string,
      profileId: result.data.user.guildProfile.id as string,
    };
  }

  try {
    const player = await account("buyer");

    await t.test("new player starts with 100 HQCoins and empty cosmetics", async () => {
      const me = await request("/profile/me", player.token);
      assert.equal(me.status, 200);
      assert.equal(me.data.profile.hqCoins, 100);
      assert.equal(me.data.profile.equippedTitle, null);
      assert.equal(me.data.profile.equippedFrame, null);
      assert.equal(me.data.profile.equippedBadge, null);
      assert.equal(me.data.profile.equippedTheme, null);

      const shop = await request("/shop/items", player.token);
      assert.equal(shop.status, 200);
      assert.equal(shop.data.hqCoins, 100);
      assert.ok(Array.isArray(shop.data.items));
      assert.ok(shop.data.items.length >= 4);
    });

    await t.test("buying cosmetic deducts coins and prevents duplicate purchases", async () => {
      const shop = await request("/shop/items", player.token);
      const cheapItem = shop.data.items.find((i: any) => i.price <= 50);
      assert.ok(cheapItem, "Must have an affordable item");

      // Purchase
      const buyRes = await request(`/shop/buy/${cheapItem.id}`, player.token, {});
      assert.equal(buyRes.status, 200);
      assert.equal(buyRes.data.newBalance, 100 - cheapItem.price);

      // Duplicate purchase fails
      const duplicateRes = await request(`/shop/buy/${cheapItem.id}`, player.token, {});
      assert.equal(duplicateRes.status, 409);

      // Check inventory
      const inv = await request("/shop/inventory", player.token);
      assert.equal(inv.status, 200);
      assert.equal(inv.data.hqCoins, 100 - cheapItem.price);
      assert.ok(inv.data.inventory.some((i: any) => i.id === cheapItem.id));
    });

    await t.test("equipping and unequipping cosmetics works and reflects on profile and ranking", async () => {
      const inv = await request("/shop/inventory", player.token);
      const owned = inv.data.inventory[0];
      assert.ok(owned);

      // Equip
      const equipRes = await request("/shop/equip", player.token, { itemId: owned.id });
      assert.equal(equipRes.status, 200);

      // Verify on /profile/me
      const profileRes = await request("/profile/me", player.token);
      assert.equal(profileRes.status, 200);
      if (owned.type === "title") assert.equal(profileRes.data.profile.equippedTitle, owned.name);
      if (owned.type === "frame") assert.equal(profileRes.data.profile.equippedFrame, owned.code);
      if (owned.type === "badge") assert.equal(profileRes.data.profile.equippedBadge, owned.code);
      if (owned.type === "theme") assert.equal(profileRes.data.profile.equippedTheme, owned.code);

      // Verify in ranking
      const rankingRes = await request("/profile/ranking", player.token);
      assert.equal(rankingRes.status, 200);
      const rankedPlayer = rankingRes.data.ranking.find((r: any) => r.id === player.profileId);
      assert.ok(rankedPlayer);
      if (owned.type === "title") assert.equal(rankedPlayer.equippedTitle, owned.name);
      if (owned.type === "frame") assert.equal(rankedPlayer.equippedFrame, owned.code);

      // Unequip
      const unequipRes = await request("/shop/equip", player.token, {
        itemId: owned.id,
        unequip: true,
      });
      assert.equal(unequipRes.status, 200);

      const afterUnequip = await request("/profile/me", player.token);
      if (owned.type === "title") assert.equal(afterUnequip.data.profile.equippedTitle, null);
      if (owned.type === "frame") assert.equal(afterUnequip.data.profile.equippedFrame, null);
    });

    await t.test("buying with insufficient coins returns 400", async () => {
      const shop = await request("/shop/items", player.token);
      const expensiveItem = shop.data.items.find((i: any) => i.price > 120);
      assert.ok(expensiveItem);

      const buyRes = await request(`/shop/buy/${expensiveItem.id}`, player.token, {});
      assert.equal(buyRes.status, 400);
    });
  } finally {
    const ids = (
      await prisma.guildProfile.findMany({
        where: { userId: { in: users } },
        select: { id: true },
      })
    ).map((p) => p.id);

    await prisma.$transaction(
      async (tx) => {
        await tx.coinTransaction.deleteMany({ where: { guildProfileId: { in: ids } } });
        await tx.userCosmetic.deleteMany({ where: { guildProfileId: { in: ids } } });
        await tx.activityLog.deleteMany({ where: { guildProfileId: { in: ids } } });
        await tx.guildProfile.deleteMany({ where: { id: { in: ids } } });
        await tx.user.deleteMany({ where: { id: { in: users } } });
      },
      { timeout: 15000 },
    );
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    await prisma.$disconnect();
  }
});
