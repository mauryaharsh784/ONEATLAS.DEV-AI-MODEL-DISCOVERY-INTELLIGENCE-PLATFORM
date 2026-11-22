import { publicGet } from "@/lib/api/public";
import { listBenchmarks } from "@/services/benchmarks";

export const dynamic = "force-dynamic";
export const GET = publicGet("benchmarks", 120, async () => {
  const rows = await listBenchmarks();
  return { data: rows, meta: { total: rows.length, simulated: rows.every((r) => r.isSimulated) } };
});
