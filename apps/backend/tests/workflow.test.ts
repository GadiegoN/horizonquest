import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";

process.env.NODE_ENV = "test";

test(
  "workflow, permissions, auditing and concurrent rewards",
  { timeout: 180000 },
  async (t) => {
    const { app } = await import("../src/server");
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const users: string[] = [];
    const classes: string[] = [];
    const suffix = randomUUID();
    async function request(
      path: string,
      token?: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
    ) {
      const res = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, data: (await res.json()) as any };
    }
    async function account(role: string) {
      const response = await request("/auth/register", undefined, {
        email: `${role}-${suffix}@example.test`,
        password: "Test-only-password-123",
        adventurerName: `Teste ${role}`,
      });
      assert.equal(response.status, 200);
      users.push(response.data.user.id);
      assert.equal(response.data.user.passwordHash, undefined);
      if (role !== "user")
        await prisma.user.update({
          where: { id: response.data.user.id },
          data: { role },
        });
      return response.data as {
        token: string;
        user: { id: string; guildProfile: { id: string } };
      };
    }
    try {
      const player = await account("user");
      const reviewer = await account("reviewer");
      const admin = await account("admin");
      let templateId = "";
      let questId = "";
      let classId = "";
      const profileBody = {
        adventurerName: "Teste aventureiro",
        classId: "",
        avatarUrl: "https://example.com/avatar.png",
        bio: "Perfil de teste",
      };

      await t.test("role matrix and immediate permission changes", async () => {
        assert.equal((await request("/quests/my")).status, 401);
        for (const token of [player.token, reviewer.token]) {
          assert.equal(
            (await request("/classes", token, { name: "Forbidden" })).status,
            403,
          );
          assert.equal(
            (await request("/quests/templates", token, {})).status,
            403,
          );
          assert.equal((await request("/profile/audit", token)).status, 403);
        }
        assert.equal(
          (await request("/quests/review/pending", player.token)).status,
          403,
        );
        assert.equal(
          (await request("/quests/review/pending", reviewer.token)).status,
          200,
        );
        assert.equal(
          (await request("/quests/review/pending", admin.token)).status,
          200,
        );
        for (const token of [player.token, reviewer.token, admin.token])
          assert.equal(
            (await request("/profile/xp/add", token, { amount: 99999 })).status,
            403,
          );
        const created = await request("/classes", admin.token, {
          name: `QA-${suffix}`,
        });
        assert.equal(created.status, 200);
        classId = created.data.class.id;
        classes.push(classId);
        profileBody.classId = classId;
        await prisma.user.update({
          where: { id: admin.user.id },
          data: { role: "user" },
        });
        assert.equal(
          (await request("/classes", admin.token, { name: "Revoked" })).status,
          403,
        );
        await prisma.user.update({
          where: { id: admin.user.id },
          data: { role: "admin" },
        });
        const me = await request("/auth/me", player.token);
        assert.equal(me.data.user.passwordHash, undefined);
      });

      await t.test(
        "profile completion grants XP exactly once and allows clearing optional fields",
        async () => {
          const responses = await Promise.all([
            request("/profile/update", player.token, profileBody, "PUT"),
            request("/profile/update", player.token, profileBody, "PUT"),
          ]);
          assert.deepEqual(
            responses.map((r) => r.status),
            [200, 200],
          );
          assert.equal(
            responses.reduce((sum, r) => sum + r.data.xpGained, 0),
            30,
          );
          assert.equal(
            (
              await request(
                "/profile/update",
                player.token,
                { ...profileBody, avatarUrl: "", bio: "" },
                "PUT",
              )
            ).status,
            200,
          );
          const restored = await request(
            "/profile/update",
            player.token,
            profileBody,
            "PUT",
          );
          assert.equal(restored.data.xpGained, 0);
          assert.equal(restored.data.profile.currentXp, 30);
        },
      );

      await t.test(
        "template administration, single active quest and ownership",
        async () => {
          const template = await request("/quests/templates", admin.token, {
            title: "Quest de teste",
            description: "Descrição para teste de integração",
            type: "qa-custom",
            difficulty: "silver",
            baseXpReward: 100,
          });
          assert.equal(template.status, 200);
          templateId = template.data.template.id;
          const edit = {
            title: "Quest de teste editada",
            description: "Descrição para teste de integração",
            type: "qa-custom",
            difficulty: "silver",
            baseXpReward: 100,
          };
          assert.equal(
            (
              await request(
                `/quests/templates/${templateId}`,
                admin.token,
                edit,
                "PUT",
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                `/quests/templates/${templateId}/toggle`,
                admin.token,
                {},
                "PATCH",
              )
            ).data.template.isActive,
            false,
          );
          assert.equal(
            (await request(`/quests/start/${templateId}`, player.token, {}))
              .status,
            400,
          );
          assert.equal(
            (
              await request(
                `/quests/templates/${templateId}/toggle`,
                admin.token,
                {},
                "PATCH",
              )
            ).data.template.isActive,
            true,
          );
          const starts = await Promise.all([
            request(`/quests/start/${templateId}`, player.token, {}),
            request(`/quests/start/${templateId}`, player.token, {}),
          ]);
          assert.deepEqual(starts.map((r) => r.status).sort(), [200, 409]);
          questId = starts.find((r) => r.status === 200)!.data.instance.id;
          assert.equal(
            (
              await request(
                `/quests/templates/${templateId}`,
                admin.token,
                edit,
                "PUT",
              )
            ).status,
            400,
          );
          assert.equal(
            (await request(`/quests/instance/${questId}`, reviewer.token))
              .status,
            403,
          );
          assert.equal(
            (
              await request(`/quests/submit/${questId}`, reviewer.token, {
                notes: "Stolen",
              })
            ).status,
            403,
          );
          assert.equal(
            (await request(`/quests/cancel/${questId}`, reviewer.token, {}))
              .status,
            403,
          );
          assert.equal(
            (
              await request(`/quests/submit/${questId}`, player.token, {
                repoUrl: "javascript:alert(1)",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(`/quests/submit/${questId}`, player.token, {
                notes: "Entrega de teste",
                repoUrl: "",
                liveDemoUrl: "",
              })
            ).status,
            200,
          );
          assert.equal(
            (await request(`/quests/instance/${questId}`, reviewer.token))
              .status,
            200,
          );
          assert.equal(
            (await request(`/quests/instance/${questId}`, admin.token)).status,
            200,
          );
          assert.equal(
            (
              await request(`/quests/review/${questId}`, player.token, {
                approved: true,
              })
            ).status,
            403,
          );
        },
      );

      await t.test(
        "review filters, rejection, resubmission and concurrent approvals",
        async () => {
          const filtered = await request(
            `/quests/review/pending?classId=${classId}&difficulty=silver&type=qa-custom`,
            reviewer.token,
          );
          assert.ok(filtered.data.instances.some((q: any) => q.id === questId));
          for (const query of [
            `classId=missing-${suffix}`,
            "difficulty=gold",
            "type=other-type",
          ]) {
            const excluded = await request(
              `/quests/review/pending?${query}`,
              reviewer.token,
            );
            assert.ok(
              !excluded.data.instances.some((q: any) => q.id === questId),
            );
          }
          assert.equal(
            (
              await request(`/quests/review/${questId}`, reviewer.token, {
                approved: false,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(`/quests/review/${questId}`, reviewer.token, {
                approved: false,
                reviewComment: "Ajustar testes.",
              })
            ).status,
            200,
          );
          const other = await request(
            `/quests/start/${templateId}`,
            player.token,
            {},
          );
          assert.equal(other.status, 200);
          assert.equal(
            (
              await request(`/quests/resubmit/${questId}`, player.token, {
                notes: "Corrigido",
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await request(
                `/quests/cancel/${other.data.instance.id}`,
                player.token,
                {},
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(`/quests/resubmit/${questId}`, player.token, {
                notes: "Corrigido",
                repoUrl: "",
                liveDemoUrl: "",
              })
            ).status,
            200,
          );
          const reviews = await Promise.all([
            request(`/quests/review/${questId}`, reviewer.token, {
              approved: true,
            }),
            request(`/quests/review/${questId}`, admin.token, {
              approved: true,
            }),
          ]);
          assert.deepEqual(reviews.map((r) => r.status).sort(), [200, 409]);
          const profile = await request("/profile/me", player.token);
          assert.equal(profile.data.profile.currentXp, 130);
          assert.equal(profile.data.profile.rank, "C");
          assert.equal(
            await prisma.xpTransaction.count({
              where: {
                guildProfileId: player.user.guildProfile.id,
                reason: "quest_completed",
              },
            }),
            1,
          );
          assert.equal(
            (await request(`/quests/cancel/${questId}`, player.token, {}))
              .status,
            409,
          );
          const own = await request(
            `/quests/start/${templateId}`,
            reviewer.token,
            {},
          );
          await request(
            `/quests/submit/${own.data.instance.id}`,
            reviewer.token,
            { notes: "Revisor também joga" },
          );
          assert.equal(
            (
              await request(
                `/quests/review/${own.data.instance.id}`,
                reviewer.token,
                { approved: true },
              )
            ).status,
            403,
          );
        },
      );

      await t.test(
        "achievements, ranking, personal history and administrator audit",
        async () => {
          const achievements = await request(
            "/profile/achievements",
            player.token,
          );
          for (const code of [
            "first_quest",
            "first_rejection",
            "first_silver_quest",
            "xp_100",
          ])
            assert.ok(
              achievements.data.achievements.some(
                (a: any) => a.code === code && a.unlocked,
              ),
            );
          const activities = await request("/profile/activity", player.token);
          for (const type of [
            "quest_started",
            "quest_submitted",
            "quest_rejected",
            "quest_resubmitted",
            "quest_completed",
            "quest_canceled",
            "profile_completed",
          ])
            assert.ok(
              activities.data.activities.some((a: any) => a.type === type),
              type,
            );
          assert.ok(
            activities.data.activities.every(
              (a: any) => a.guildProfileId === player.user.guildProfile.id,
            ),
          );
          const ranking = await request("/profile/ranking", player.token);
          assert.equal(ranking.status, 200);
          assert.ok(
            ranking.data.ranking.every((p: any) => !p.email && !p.passwordHash),
          );
          assert.ok(
            ranking.data.ranking.every(
              (p: any, i: number, rows: any[]) =>
                i === 0 || rows[i - 1].currentXp >= p.currentXp,
            ),
          );
          const audit = await request(
            "/profile/audit?type=questTemplate_create",
            admin.token,
          );
          assert.ok(
            audit.data.activities.some(
              (a: any) =>
                a.meta.resourceId === templateId &&
                a.meta.actorId === admin.user.id,
            ),
          );
          const removed = await request(
            `/quests/templates/${templateId}`,
            admin.token,
            undefined,
            "DELETE",
          );
          assert.equal(removed.status, 200);
          assert.equal(removed.data.deleted, false);
          assert.equal(
            (await request(`/quests/start/${templateId}`, admin.token, {}))
              .status,
            400,
          );
          const unused = await request("/quests/templates", admin.token, {
            title: "Template descartável",
            description: "Descrição para exclusão física",
            type: "frontend",
            difficulty: "easy",
            baseXpReward: 10,
          });
          assert.equal(
            (
              await request(
                `/quests/templates/${unused.data.template.id}`,
                admin.token,
                undefined,
                "DELETE",
              )
            ).data.deleted,
            true,
          );
          assert.equal(
            (
              await request(
                `/classes/${classId}`,
                admin.token,
                { name: `QA-updated-${suffix}` },
                "PUT",
              )
            ).status,
            200,
          );
        },
      );
    } finally {
      // Delete only records belonging to the accounts created by this test run.
      const profiles = await prisma.guildProfile.findMany({
        where: { userId: { in: users } },
        select: { id: true },
      });
      const ids = profiles.map((p) => p.id);
      await prisma.$transaction(
        async (tx) => {
          await tx.questSubmissionDetail.deleteMany({
            where: { questInstance: { guildProfileId: { in: ids } } },
          });
          await tx.questInstance.deleteMany({
            where: { guildProfileId: { in: ids } },
          });
          await tx.questTemplate.deleteMany({
            where: { createdByUserId: { in: users } },
          });
          await tx.activityLog.deleteMany({
            where: { guildProfileId: { in: ids } },
          });
          await tx.xpTransaction.deleteMany({
            where: { guildProfileId: { in: ids } },
          });
          await tx.userAchievement.deleteMany({
            where: { guildProfileId: { in: ids } },
          });
          await tx.guildProfile.deleteMany({ where: { id: { in: ids } } });
          await tx.user.deleteMany({ where: { id: { in: users } } });
          await tx.class.deleteMany({ where: { id: { in: classes } } });
        },
        { timeout: 15000 },
      );
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await prisma.$disconnect();
    }
  },
);
