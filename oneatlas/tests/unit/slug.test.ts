import { describe, expect, it } from "vitest";

import { canonicalize, familyOf, prettyName } from "@/services/ingest/slug";

describe("canonicalize", () => {
  it("strips provider prefixes, regions, versions and snapshot dates", () => {
    expect(canonicalize("bedrock/us-east-1/anthropic.claude-haiku-4-5-20251001-v1:0")).toEqual({ slug: "claude-haiku-4-5", snapshotDate: "2025-10-01", region: "us-east-1" });
    expect(canonicalize("us.anthropic.claude-sonnet-4-5-20250929-v1:0")).toMatchObject({ slug: "claude-sonnet-4-5", region: "us" });
    expect(canonicalize("claude-haiku-4-5@20251001")).toMatchObject({ slug: "claude-haiku-4-5", snapshotDate: "2025-10-01" });
    expect(canonicalize("gpt-4o-2024-08-06")).toMatchObject({ slug: "gpt-4o", snapshotDate: "2024-08-06" });
    expect(canonicalize("fireworks_ai/accounts/fireworks/models/deepseek-v4-pro").slug).toBe("deepseek-v4-pro");
  });
  it("does not mistake version numbers with dots for vendor prefixes", () => {
    expect(canonicalize("gemini-2.5-pro").slug).toBe("gemini-2.5-pro");
    expect(canonicalize("gpt-4.1-mini").slug).toBe("gpt-4.1-mini");
    expect(canonicalize("meta.llama3-70b-instruct-v1:0").slug).toBe("llama3-70b-instruct");
  });
  it("drops -latest aliases and rejects impossible dates", () => {
    expect(canonicalize("mistral-large-latest").slug).toBe("mistral-large");
    expect(canonicalize("model-20259999").snapshotDate).toBeNull();
  });
});

describe("prettyName / familyOf", () => {
  it("formats common model names", () => {
    expect(prettyName("claude-3-5-sonnet")).toBe("Claude 3.5 Sonnet");
    expect(prettyName("gpt-4o")).toBe("GPT-4o");
    expect(prettyName("gpt-4-1-mini")).toBe("GPT-4.1 Mini");
    expect(prettyName("llama-3.3-70b-instruct")).toBe("Llama 3.3 70B Instruct");
    expect(prettyName("deepseek-v4-pro")).toBe("DeepSeek V4 Pro");
  });
  it("derives a family from the leading name tokens", () => {
    expect(familyOf("claude-3-5-sonnet")).toBe("claude");
    expect(familyOf("gpt-4o")).toBe("gpt");
    expect(familyOf("deepseek-v4-pro")).toBe("deepseek");
  });
});
