/** Refresh prisma/seed/data/litellm-snapshot.json from the live registry. Usage: npm run data:snapshot */
import fs from "node:fs";
import path from "node:path";
import { LITELLM_URL, buildSnapshot } from "@/services/ingest/litellm";

async function main() {
  const file = process.argv[2];
  const raw = file ? JSON.parse(fs.readFileSync(file, "utf8")) : await (await fetch(LITELLM_URL)).json();
  const entries = buildSnapshot(raw);
  const out = path.resolve(__dirname, "../prisma/seed/data/litellm-snapshot.json");
  fs.writeFileSync(out, JSON.stringify({ meta: { sourceUrl: LITELLM_URL, fetchedAt: new Date().toISOString().slice(0, 10), entries: Object.keys(entries).length }, entries }));
  console.log(`snapshot: ${Object.keys(entries).length} entries → ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
main().catch((e) => { console.error(e); process.exit(1); });
