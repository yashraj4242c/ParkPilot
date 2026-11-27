import { PrismaClient } from "@prisma/client";
import { config } from "../config.js";

declare global {
  var __parkpilotPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  const opts: ConstructorParameters<typeof PrismaClient>[0] = {
    log: config.isProd ? ["error"] : ["error", "warn"],
  };
  if (databaseUrl) {
    opts.datasources = { db: { url: databaseUrl } };
  }
  return new PrismaClient(opts);
}

export const prisma: PrismaClient =
  globalThis.__parkpilotPrisma ?? createPrismaClient();

if (!config.isProd) {
  globalThis.__parkpilotPrisma = prisma;
}
