import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";

const req = (ip: string) => new Request("http://x/", { headers: { "x-forwarded-for": ip } });

describe("rateLimit", () => {
  it("allows up to the limit then throws a 429 ApiError", () => {
    const b = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(() => rateLimit(req("1.1.1.1"), b, 3)).not.toThrow();
    try { rateLimit(req("1.1.1.1"), b, 3); throw new Error("should have thrown"); } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(429);
    }
  });
  it("tracks clients and buckets independently", () => {
    const b = `t-${Math.random()}`;
    rateLimit(req("2.2.2.2"), b, 1);
    expect(() => rateLimit(req("3.3.3.3"), b, 1)).not.toThrow();
    expect(() => rateLimit(req("2.2.2.2"), `${b}-other`, 1)).not.toThrow();
  });
  it("resets after the window", async () => {
    const b = `t-${Math.random()}`;
    rateLimit(req("4.4.4.4"), b, 1, 20);
    await new Promise((r) => setTimeout(r, 30));
    expect(() => rateLimit(req("4.4.4.4"), b, 1, 20)).not.toThrow();
  });
});
