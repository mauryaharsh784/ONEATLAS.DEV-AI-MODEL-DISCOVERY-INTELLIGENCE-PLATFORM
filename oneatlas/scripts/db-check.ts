/* Verifies: env parsing → Prisma Client (7.x, adapter-pg) → real PostgreSQL round trip. */
import "dotenv/config";
import { getDb } from "@/lib/db";

async function main() {
  const db = getDb();
  const [row] = await db.$queryRaw<{ version: string; db: string }[]>`
    SELECT version() AS version, current_database() AS db`;
  console.log("connected to:", row.db);
  console.log("server:", row.version.split(",")[0]);
  const tables = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log("public tables:", Number(tables[0].n), "(0 expected until Phase 2 migrations)");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("db-check failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
