import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const rawDatabaseUrl = process.env.DATABASE_URL || "";
const directUrl = process.env.DIRECT_URL || rawDatabaseUrl.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    ...(directUrl ? { directUrl } : {}),
  },
});
