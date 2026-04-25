// lib/prisma.ts
// This file creates a single Prisma database connection that is reused across
// all API routes. Without this, Next.js would open hundreds of connections
// during development when files reload automatically.

import { PrismaClient } from "@prisma/client";

// We attach the client to the global object in development so it survives
// hot-reloads. In production, we always create a fresh client.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
