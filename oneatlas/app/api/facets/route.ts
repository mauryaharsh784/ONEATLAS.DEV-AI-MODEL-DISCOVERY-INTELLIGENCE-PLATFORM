import { publicGet } from "@/lib/api/public";
import { getFacets } from "@/services/models";

export const dynamic = "force-dynamic";
export const GET = publicGet("facets", 60, async () => ({ data: await getFacets() }));
