import { describe, expect, it } from "vitest";

import { formatDate, formatInteger, formatPricePerMTok, formatScore, formatTokens, formatUsd, weightsLabel } from "@/lib/format";

describe("formatTokens", () => {
  it("abbreviates millions, thousands and small numbers", () => {
    expect(formatTokens(1_050_000)).toBe("1.05M");
    expect(formatTokens(1_000_000)).toBe("1M");
    expect(formatTokens(128_000)).toBe("128K");
    expect(formatTokens(8_192)).toBe("8.2K");
    expect(formatTokens(512)).toBe("512");
    expect(formatTokens(10_000_000)).toBe("10M");
  });
  it("returns a dash for missing or invalid values", () => {
    expect(formatTokens(null)).toBe("—");
    expect(formatTokens(undefined)).toBe("—");
    expect(formatTokens("")).toBe("—");
    expect(formatTokens(Number.NaN)).toBe("—");
  });
  it("accepts numeric strings (Prisma Decimal serialises to string)", () => {
    expect(formatTokens("128000")).toBe("128K");
  });
});

describe("formatPricePerMTok", () => {
  it("formats normal prices with two decimals", () => {
    expect(formatPricePerMTok(1)).toBe("$1.00");
    expect(formatPricePerMTok("5.5")).toBe("$5.50");
    expect(formatPricePerMTok(0.1)).toBe("$0.10");
  });
  it("keeps precision for sub-cent prices without trailing noise", () => {
    expect(formatPricePerMTok(0.0083)).toBe("$0.0083");
    expect(formatPricePerMTok(0.003)).toBe("$0.003");
    expect(formatPricePerMTok(0.05)).toBe("$0.05");
  });
  it("renders zero as Free and null as a dash", () => {
    expect(formatPricePerMTok(0)).toBe("Free");
    expect(formatPricePerMTok(null)).toBe("—");
    expect(formatPricePerMTok(null, { free: true })).toBe("Free");
  });
});

describe("formatUsd", () => {
  it("uses 2 decimals for whole dollars and more for tiny totals", () => {
    expect(formatUsd(12.5)).toBe("$12.50");
    expect(formatUsd(0.042)).toBe("$0.042");
    expect(formatUsd(0.000123)).toBe("$0.000123");
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(null)).toBe("—");
  });
});

describe("misc formatters", () => {
  it("formatInteger groups digits", () => {
    expect(formatInteger(1_050_000)).toBe("1,050,000");
    expect(formatInteger(undefined)).toBe("—");
  });
  it("formatDate is timezone-stable (UTC)", () => {
    expect(formatDate("2026-10-26")).toBe("Oct 26, 2026");
    expect(formatDate(new Date("2026-01-01T00:00:00Z"))).toBe("Jan 1, 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
  it("formatScore and weightsLabel", () => {
    expect(formatScore(51.34)).toBe("51.3");
    expect(formatScore("7.25", 2)).toBe("7.25");
    expect(formatScore(null)).toBe("—");
    expect(weightsLabel(true)).toBe("Open weights");
    expect(weightsLabel(false)).toBe("Closed weights");
  });
});
