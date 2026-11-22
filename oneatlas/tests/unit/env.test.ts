import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

const valid = { DATABASE_URL: "postgresql://u:p@localhost:5432/db" };

describe("parseEnv", () => {
  it("accepts a minimal valid environment and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
  });
  it("treats empty-string optionals as undefined (as in .env.example)", () => {
    const env = parseEnv({ ...valid, DIRECT_URL: "", AUTH_SECRET: "", OPENAI_API_KEY: "", DATABASE_POOL_MAX: "" });
    expect(env.DIRECT_URL).toBeUndefined();
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.DATABASE_POOL_MAX).toBe(10);
  });
  it("coerces the pool size from a string", () => {
    expect(parseEnv({ ...valid, DATABASE_POOL_MAX: "3" }).DATABASE_POOL_MAX).toBe(3);
  });
  it("rejects a missing DATABASE_URL with an actionable message", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
  it("rejects a non-PostgreSQL URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://u:p@h/db" })).toThrow(/PostgreSQL/);
  });
  it("rejects an out-of-range pool size", () => {
    expect(() => parseEnv({ ...valid, DATABASE_POOL_MAX: "0" })).toThrow();
    expect(() => parseEnv({ ...valid, DATABASE_POOL_MAX: "500" })).toThrow();
  });
});
