import { describe, expect, it } from "vitest";

import { BENCHMARKS, simulateScore, type ScoreInput } from "@/services/ingest/benchmarks";

const def = (slug: string) => BENCHMARKS.find((b) => b.slug === slug)!;
const model = (over: Partial<ScoreInput> = {}): ScoreInput => ({ canonicalId: "lab/model", outputPrice: 10, inputPrice: 2, releaseYear: 2026, caps: new Set(), ...over });

describe("simulateScore", () => {
  it("is deterministic for the same model and benchmark", () => {
    expect(simulateScore(def("coding-index"), model())).toBe(simulateScore(def("coding-index"), model()));
  });
  it("varies between models and between benchmarks", () => {
    expect(simulateScore(def("coding-index"), model())).not.toBe(simulateScore(def("coding-index"), model({ canonicalId: "lab/other" })));
    expect(simulateScore(def("coding-index"), model())).not.toBe(simulateScore(def("math-index"), model()));
  });
  it("only scores eligible models", () => {
    expect(simulateScore(def("vision-index"), model())).toBeNull();
    expect(simulateScore(def("vision-index"), model({ caps: new Set(["vision"]) }))).not.toBeNull();
    expect(simulateScore(def("agentic-index"), model())).toBeNull();
    expect(simulateScore(def("intelligence-index"), model({ outputPrice: null, inputPrice: null }))).toBeNull();
  });
  it("stays inside each benchmark's declared scale", () => {
    for (let i = 0; i < 300; i++) {
      const m = model({ canonicalId: `lab/m${i}`, outputPrice: Math.exp((i % 12) - 3), caps: new Set(["vision", "tool_calling", "reasoning"]), releaseYear: 2022 + (i % 5) });
      for (const b of BENCHMARKS) {
        const s = simulateScore(b, m)!;
        expect(s).toBeGreaterThanOrEqual(b.scaleMin);
        expect(s).toBeLessThanOrEqual(b.scaleMax);
      }
    }
  });
  it("gives pricier models higher intelligence on average, and reasoning models a boost", () => {
    const avg = (p: number, caps: string[]) => Array.from({ length: 200 }, (_, i) => simulateScore(def("reasoning-index"), model({ canonicalId: `x/${i}`, outputPrice: p, caps: new Set(caps) }))!).reduce((a, b) => a + b, 0) / 200;
    expect(avg(60, [])).toBeGreaterThan(avg(0.3, []));
    expect(avg(10, ["reasoning"])).toBeGreaterThan(avg(10, []));
  });
  it("labels every benchmark as simulated in its methodology", () => {
    for (const b of BENCHMARKS) expect(b.methodology.toLowerCase()).toContain("simulated");
  });
});
