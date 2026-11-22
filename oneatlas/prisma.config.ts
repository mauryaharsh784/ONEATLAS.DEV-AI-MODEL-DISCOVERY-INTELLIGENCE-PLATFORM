import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 keeps the connection URL out of schema.prisma.
// Migrations should use a DIRECT (non-pooled) connection; the app runtime uses DATABASE_URL
// (pooled on Neon). DIRECT_URL falls back to DATABASE_URL for local development.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
