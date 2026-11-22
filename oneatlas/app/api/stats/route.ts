import { publicGet } from "@/lib/api/public";
import { getOverview } from "@/services/overview";

export const dynamic = "force-dynamic";
export const GET = publicGet("stats", 60, async () => ({ data: await getOverview() }));
