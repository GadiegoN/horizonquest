import { config } from "dotenv";
import { resolve } from "node:path";

// Resolve from src/lib (or dist/lib), independently of the launch directory.
// Import this module from every consumer so initialization order is explicit.
config({ path: resolve(__dirname, "../../.env"), quiet: true });

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configure ${name} no ambiente ou em apps/backend/.env.`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
try {
  const url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
} catch {
  throw new Error("DATABASE_URL deve ser uma URL PostgreSQL válida.");
}

export const environment = {
  databaseUrl,
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};
