import { describe, expect, it } from "vitest";

import { parseListQuery, parseModelQuery, parseRankingQuery } from "@/lib/validation/query";
import { buildHref } from "@/lib/url";

describe("parseModelQuery", () => {
  it("applies defaults", () => {
    expect(parseModelQuery(new URLSearchParams(""))).toMatchObject({ sort: "popularity", page: 1, pageSize: 24, lab: [], open: false, deprecated: false });
  });
  it("parses CSV lists, flags and numbers from URLSearchParams and plain objects", () => {
    const q = parseModelQuery(new URLSearchParams("lab=openai,anthropic&cap=reasoning&open=1&free=true&minContext=128000&maxInput=1.5&q=%20gpt%20"));
    expect(q).toMatchObject({ lab: ["openai", "anthropic"], cap: ["reasoning"], open: true, free: true, minContext: 128000, maxInput: 1.5, q: "gpt" });
    expect(parseModelQuery({ lab: ["a", "b"], sort: "released", dir: "asc" })).toMatchObject({ lab: ["a", "b"], sort: "released", dir: "asc" });
  });
  it("falls back safely on invalid sort, page and page size", () => {
    expect(parseModelQuery(new URLSearchParams("sort=hax&page=-3&pageSize=7"))).toMatchObject({ sort: "popularity", page: 1, pageSize: 24 });
    expect(parseModelQuery(new URLSearchParams("pageSize=48"))).toMatchObject({ pageSize: 48 });
  });
  it("rejects out-of-range numeric filters and over-long queries", () => {
    expect(() => parseModelQuery(new URLSearchParams("minContext=-5"))).toThrow();
    expect(() => parseModelQuery(new URLSearchParams(`q=${"x".repeat(101)}`))).toThrow();
  });
  it("caps list length to prevent abuse", () => {
    expect(parseModelQuery(new URLSearchParams(`lab=${Array.from({ length: 100 }, (_, i) => "l" + i).join(",")}`)).lab).toHaveLength(40);
  });
});

describe("parseRankingQuery / parseListQuery", () => {
  it("accepts only known categories and list sizes", () => {
    expect(parseRankingQuery({ category: "coding", limit: "50" })).toEqual({ category: "coding", limit: 50 });
    expect(parseRankingQuery({ category: "bogus", limit: "7" })).toEqual({ category: "overall", limit: 20 });
  });
  it("clamps list page size", () => {
    expect(parseListQuery({ pageSize: "999" }).pageSize).toBe(24);
  });
});

describe("buildHref", () => {
  it("merges updates, removes nulls and resets page", () => {
    expect(buildHref("/models", { q: "a", page: "3", sort: "name" }, { sort: "context" })).toBe("/models?q=a&sort=context");
    expect(buildHref("/models", { q: "a" }, { q: null })).toBe("/models");
    expect(buildHref("/models", { q: "a" }, { page: "2" })).toBe("/models?q=a&page=2");
  });
});
