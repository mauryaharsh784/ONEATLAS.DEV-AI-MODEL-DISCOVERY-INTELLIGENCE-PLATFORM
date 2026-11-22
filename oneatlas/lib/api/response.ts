import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Every API route returns this envelope. */
export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have access to this resource") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message: string) {
    return new ApiError(409, "CONFLICT", message);
  }
  static tooMany(message = "Too many requests") {
    return new ApiError(429, "RATE_LIMITED", message);
  }
}

export function ok<T>(data: T, init?: { status?: number; meta?: Record<string, unknown>; headers?: HeadersInit }) {
  const body: ApiSuccess<T> = { ok: true, data, ...(init?.meta ? { meta: init.meta } : {}) };
  return NextResponse.json(body, { status: init?.status ?? 200, headers: init?.headers });
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  const body: ApiFailure = { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } };
  return NextResponse.json(body, { status });
}

/**
 * Central error → response mapping. Unknown errors are logged server-side and
 * returned as an opaque 500 so internals (SQL, stack traces, env) never leak.
 */
export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) return fail(error.status, error.code, error.message, error.details);
  if (error instanceof ZodError) {
    return fail(400, "VALIDATION_ERROR", "Request validation failed", error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })));
  }
  console.error("[api] unhandled error", error);
  return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/** Wrap a route handler so thrown errors always become consistent JSON responses. */
export function route<Args extends unknown[]>(handler: (...args: Args) => Promise<Response> | Response) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
