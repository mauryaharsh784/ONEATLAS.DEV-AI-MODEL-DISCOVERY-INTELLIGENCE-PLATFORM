import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, fail, ok, route, toErrorResponse } from "@/lib/api/response";

describe("api response helpers", () => {
  it("ok() wraps data in the success envelope", async () => {
    const res = ok({ a: 1 }, { status: 201, meta: { total: 5 } });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 }, meta: { total: 5 } });
  });
  it("fail() wraps errors in the failure envelope", async () => {
    const res = fail(404, "NOT_FOUND", "nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "nope" } });
  });
  it("maps ApiError to its status and code", async () => {
    const res = toErrorResponse(ApiError.forbidden());
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });
  it("maps ZodError to 400 with per-field details", async () => {
    const parsed = z.object({ n: z.number() }).safeParse({ n: "x" });
    if (parsed.success) throw new Error("expected failure");
    const res = toErrorResponse(parsed.error);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].path).toBe("n");
  });
  it("hides internals of unknown errors behind an opaque 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = toErrorResponse(new Error("SELECT * FROM secrets failed at 10.0.0.5"));
    const text = JSON.stringify(await res.json());
    expect(res.status).toBe(500);
    expect(text).not.toContain("secrets");
    expect(text).not.toContain("10.0.0.5");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it("route() converts thrown errors into responses", async () => {
    const handler = route(async () => {
      throw ApiError.notFound("model missing");
    });
    const res = await handler();
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toBe("model missing");
  });
});
