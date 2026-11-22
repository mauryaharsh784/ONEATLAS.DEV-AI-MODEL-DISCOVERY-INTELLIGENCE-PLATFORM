import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Integration tests need a migrated + seeded PostgreSQL (DATABASE_URL). Run: npm run test:integration */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node", include: ["tests/integration/**/*.test.ts"], setupFiles: ["dotenv/config"], testTimeout: 30_000, fileParallelism: false },
});
