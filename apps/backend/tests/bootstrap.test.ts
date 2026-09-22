import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("backend loads its own environment without a dotenv preload", { timeout: 30000 }, () => {
  const env = { ...process.env };
  for (const key of ["DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN", "NODE_OPTIONS"]) delete env[key];
  const backend = resolve(__dirname, "..");
  // Launch outside the backend directory, with no test-level dotenv import.
  const code = `
    const { prisma } = require(${JSON.stringify(resolve(backend, "src/lib/prisma.ts"))});
    const { generateToken, verifyToken } = require(${JSON.stringify(resolve(backend, "src/lib/jwt.ts"))});
    (async () => {
      try {
        if (verifyToken(generateToken({ userId: 'bootstrap-test', role: 'user' })).userId !== 'bootstrap-test') throw new Error('JWT failed');
        await prisma.user.findFirst({ select: { id: true } });
        console.log('BOOTSTRAP_OK');
      } finally { await prisma.$disconnect(); }
    })().catch(() => { console.error('BOOTSTRAP_FAILED'); process.exitCode = 1; });
  `;
  const output = execFileSync(process.execPath, ["--import", pathToFileURL(require.resolve("tsx")).href, "--eval", code], {
    cwd: resolve(backend, "../.."), env, encoding: "utf8", timeout: 25000,
  });
  assert.match(output, /BOOTSTRAP_OK/);
});
