import { PrismaClient } from "@prisma/client";
import { config } from "../config.js";

declare global {
  var __parkpilotPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__parkpilotPrisma ??
  new PrismaClient({
    log: config.isProd ? ["error"] : ["error", "warn"],
  });

if (!config.isProd) {
  globalThis.__parkpilotPrisma = prisma;
}
