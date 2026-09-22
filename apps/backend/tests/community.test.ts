import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";

process.env.NODE_ENV = "test";

test("projects, private journal and tavern", { timeout: 180000 }, async t => {
  const { app } = await import("../src/server");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const suffix = randomUUID();
  const users: string[] = [];
  async function request(path: string, token?: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() as any };
  }
  async function account(role: string) {
    const result = await request("/auth/register", undefined, { email: `community-${role}-${suffix}@example.test`, password: "Test-only-password-123", adventurerName: `Community ${role}` });
    assert.equal(result.status, 200); users.push(result.data.user.id);
    if (role !== "user") await prisma.user.update({ where: { id: result.data.user.id }, data: { role } });
    return { token: result.data.token as string, profileId: result.data.user.guildProfile.id as string };
  }
  try {
    const player = await account("user"); const reviewer = await account("reviewer"); const admin = await account("admin");
    await t.test("project CRUD, ownership, team, status and filters", async () => {
      assert.equal((await request("/projects")).status, 401);
      const payload = { name: `Projeto-${suffix}`, description: "Projeto colaborativo de teste", repoUrl: "https://example.com/repo" };
      assert.equal((await request("/projects", player.token, { ...payload, repoUrl: "javascript:alert(1)" })).status, 400);
      const created = await request("/projects", player.token, payload);
      assert.equal(created.status, 201); const id = created.data.project.id;
      const detail = await request(`/projects/${id}`, reviewer.token);
      assert.equal(detail.data.project.members.length, 1); assert.equal(detail.data.project.members[0].role, "owner");
      assert.equal((await request(`/projects/${id}`, reviewer.token, { ...payload, status: "active" }, "PUT")).status, 403);
      assert.equal((await request(`/projects/${id}`, admin.token, undefined, "DELETE")).status, 403);
      const joins = await Promise.all([request(`/projects/${id}/join`, reviewer.token, {}), request(`/projects/${id}/join`, reviewer.token, {})]);
      assert.ok(joins.every(r => r.status === 200));
      assert.equal((await request(`/projects/${id}`, player.token)).data.project.members.length, 2);
      assert.equal((await request(`/projects?q=${suffix}&mine=true`, reviewer.token)).data.projects.length, 1);
      assert.equal((await request(`/projects?q=${suffix}&mine=true`, admin.token)).data.projects.length, 0);
      assert.equal((await request(`/projects/${id}/members/${reviewer.profileId}`, admin.token, undefined, "DELETE")).status, 403);
      assert.equal((await request(`/projects/${id}/members/${player.profileId}`, player.token, undefined, "DELETE")).status, 409);
      assert.equal((await request(`/projects/${id}`, player.token, { ...payload, status: "completed" }, "PUT")).status, 200);
      assert.equal((await request(`/projects/${id}/join`, admin.token, {})).status, 409);
      assert.equal((await request(`/projects?q=${suffix}&status=active`, player.token)).data.projects.length, 0);
      assert.equal((await request(`/projects?q=${suffix}&status=completed`, player.token)).data.projects.length, 1);
      assert.equal((await request(`/projects/${id}/members/${reviewer.profileId}`, reviewer.token, undefined, "DELETE")).status, 200);
      const edited = await request(`/projects/${id}`, player.token, { ...payload, status: "active", repoUrl: "" }, "PUT");
      assert.equal(edited.data.project.repoUrl, null);
      await request(`/projects/${id}/join`, reviewer.token, {});
      assert.equal((await request(`/projects/${id}/members/${reviewer.profileId}`, player.token, undefined, "DELETE")).status, 200);
      assert.equal((await request(`/projects/${id}`, player.token, undefined, "DELETE")).status, 200);
      assert.equal((await request(`/projects/${id}`, player.token)).status, 404);
      assert.equal(await prisma.projectMember.count({ where: { projectId: id } }), 0);
    });
    await t.test("private journal CRUD, search and pagination", async () => {
      assert.equal((await request("/journal")).status, 401);
      const body = { title: `Segredo-${suffix}`, content: "Aprendizado privado", weekReference: "2026-09-21" };
      assert.equal((await request("/journal", player.token, { ...body, content: "  " })).status, 400);
      assert.equal((await request("/journal", player.token, { ...body, weekReference: "2026-02-30" })).status, 400);
      const entry = await request("/journal", player.token, body);
      assert.equal(entry.status, 201); const id = entry.data.entry.id;
      assert.ok(entry.data.entry.weekReference.startsWith("2026-09-21"));
      for (const token of [reviewer.token, admin.token]) {
        assert.equal((await request(`/journal?q=${suffix}`, token)).data.entries.length, 0);
        assert.equal((await request(`/journal/${id}`, token, body, "PUT")).status, 404);
        assert.equal((await request(`/journal/${id}`, token, undefined, "DELETE")).status, 404);
      }
      const edited = await request(`/journal/${id}`, player.token, { ...body, content: "Texto revisado", weekReference: "" }, "PUT");
      assert.equal(edited.data.entry.weekReference, null); assert.equal(edited.data.entry.content, "Texto revisado");
      await prisma.journalEntry.createMany({ data: Array.from({ length: 22 }, (_, i) => ({ guildProfileId: player.profileId, title: `Página-${suffix}-${i}`, content: "Conteúdo de paginação" })) });
      const first = await request(`/journal?q=${suffix}&page=1`, player.token); const second = await request(`/journal?q=${suffix}&page=2`, player.token);
      assert.equal(first.data.entries.length, 20); assert.equal(first.data.hasMore, true);
      assert.equal(second.data.entries.length, 3); assert.equal(second.data.hasMore, false);
      assert.ok(second.data.entries.every((entry: any) => !first.data.entries.some((other: any) => other.id === entry.id)));
      assert.equal((await request("/journal?page=0", player.token)).status, 400);
      assert.equal((await request(`/journal/${id}`, player.token, undefined, "DELETE")).status, 200);
      const audit = await request("/profile/audit", admin.token);
      assert.ok(!JSON.stringify(audit.data).includes(body.title));
    });
    await t.test("tavern messages, replies, editing and moderation", async () => {
      assert.equal((await request("/tavern")).status, 401);
      assert.equal((await request("/tavern", player.token, { content: " " })).status, 400);
      assert.equal((await request("/tavern", player.token, { content: "x".repeat(2001) })).status, 400);
      assert.equal((await request("/tavern", player.token, { content: "Resposta", replyToMessageId: "missing" })).status, 404);
      const post = await request("/tavern", player.token, { content: `Conversa-${suffix}` });
      assert.equal(post.status, 201); const id = post.data.message.id;
      const reply = await request("/tavern", reviewer.token, { content: `Resposta-${suffix}`, replyToMessageId: id });
      assert.equal(reply.status, 201); assert.equal(reply.data.message.replyTo.id, id);
      assert.equal((await request(`/tavern/${id}`, reviewer.token, { content: "Invadido" }, "PUT")).status, 404);
      assert.equal((await request(`/tavern/${id}`, reviewer.token, undefined, "DELETE")).status, 403);
      assert.equal((await request(`/tavern/${id}`, admin.token, { content: "Admin não edita outro autor" }, "PUT")).status, 404);
      assert.equal((await request(`/tavern/${id}`, player.token, { content: `Editado-${suffix}` }, "PUT")).status, 200);
      const feed = await request(`/tavern?q=${suffix}`, admin.token);
      assert.equal(feed.data.messages.length, 2);
      assert.ok(feed.data.messages.every((m: any) => !m.guildProfile.userId && !m.guildProfile.email));
      assert.equal((await request(`/tavern/${id}`, admin.token, undefined, "DELETE")).status, 200);
      const preserved = await prisma.tavernMessage.findUniqueOrThrow({ where: { id: reply.data.message.id } });
      assert.equal(preserved.replyToMessageId, null);
      assert.equal((await request(`/tavern/${preserved.id}`, reviewer.token, undefined, "DELETE")).status, 200);
      const audit = await request("/profile/audit?type=tavern_moderated", admin.token);
      assert.ok(audit.data.activities.some((a: any) => a.meta.messageId === id));
      assert.equal((await request("/profile/me", player.token)).data.profile.currentXp, 0);
    });
  } finally {
    const ids = (await prisma.guildProfile.findMany({ where: { userId: { in: users } }, select: { id: true } })).map(p => p.id);
    await prisma.$transaction(async tx => {
      await tx.tavernMessage.deleteMany({ where: { guildProfileId: { in: ids } } });
      await tx.journalEntry.deleteMany({ where: { guildProfileId: { in: ids } } });
      await tx.projectMember.deleteMany({ where: { OR: [{ guildProfileId: { in: ids } }, { project: { createdByGuildProfileId: { in: ids } } }] } });
      await tx.project.deleteMany({ where: { createdByGuildProfileId: { in: ids } } });
      await tx.activityLog.deleteMany({ where: { guildProfileId: { in: ids } } });
      await tx.guildProfile.deleteMany({ where: { id: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: users } } });
    }, { timeout: 15000 });
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    await prisma.$disconnect();
  }
});
