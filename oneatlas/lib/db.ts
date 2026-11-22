import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

/**
 * Prisma client singleton (Prisma 7 requires a driver adapter).
 * Lazy so importing this module never opens a connection at build time.
 * The instance is cached on globalThis in dev to survive hot reloads.
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient(): PrismaClient {
  const env = getEnv();
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
  });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.__prisma) globalForPrisma.__prisma = createClient();
  return globalForPrisma.__prisma;
}

export type Db = PrismaClient;
