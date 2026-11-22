import { getDb } from "@/lib/db";
import { fail, ok, route } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/** Liveness + database connectivity probe (used by deploy checks). Also reports catalog size. */
export const GET = route(async () => {
  const started = performance.now();
  let models: number;
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    models = await db.model.count().catch(() => -1); // -1 = tables not migrated yet
  } catch (error) {
    console.error("[health] database check failed", error);
    return fail(503, "DATABASE_UNAVAILABLE", "Database is not reachable");
  }
  return ok({ status: "ok", database: "up", migrated: models >= 0, models: models >= 0 ? models : null, latencyMs: Math.round(performance.now() - started), time: new Date().toISOString() });
});
