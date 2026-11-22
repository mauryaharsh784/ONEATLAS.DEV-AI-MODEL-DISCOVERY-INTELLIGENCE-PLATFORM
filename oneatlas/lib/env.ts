import { z } from "zod";

/**
 * Validated, typed access to server environment variables.
 * Parsing is lazy + memoised so `next build` does not require secrets for static pages,
 * but any code path that actually needs the database fails fast with a clear message.
 */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL must be a PostgreSQL connection string"),
  DIRECT_URL: optionalString,
  DATABASE_POOL_MAX: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(10)),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  AUTH_SECRET: optionalString,
  OPENROUTER_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function parseEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;
export function getEnv(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
