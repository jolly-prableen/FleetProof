import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured for Prisma.");
}

const g = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  g.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
if (process.env.NODE_ENV !== "production") g.prisma = db;
