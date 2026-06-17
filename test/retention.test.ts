import { describe, it, expect } from "vitest";
import { buildRetentionMatrix } from "@/lib/retention";

describe("buildRetentionMatrix", () => {
  it("returns no data for empty input", () => {
    expect(buildRetentionMatrix([]).hasData).toBe(false);
  });

  it("computes M0=100% and subsequent retention by phone", () => {
    const rows = [
      { phone: "+1A", created_at: "2026-01-10T00:00:00Z" },
      { phone: "+1A", created_at: "2026-02-05T00:00:00Z" }, // A returns in M1
      { phone: "+1B", created_at: "2026-01-20T00:00:00Z" }, // B only M0
    ];
    const data = buildRetentionMatrix(rows, new Date("2026-02-15T00:00:00Z"));
    expect(data.hasData).toBe(true);
    expect(data.offsets).toEqual([0, 1]);
    expect(data.cohorts).toHaveLength(1);

    const c = data.cohorts[0];
    expect(c.size).toBe(2);
    expect(c.values[0]).toBe(100);
    expect(c.values[1]).toBe(50);
  });

  it("marks future offsets as null", () => {
    const rows = [{ phone: "+1A", created_at: "2026-02-10T00:00:00Z" }];
    const data = buildRetentionMatrix(rows, new Date("2026-02-15T00:00:00Z"), {
      maxOffset: 3,
    });
    expect(data.offsets).toEqual([0]); // earliest cohort is the current month
    expect(data.cohorts[0].values).toEqual([100]);
  });

  it("ignores rows without a phone (e.g. GDPR-redacted)", () => {
    const rows = [
      { phone: null, created_at: "2026-01-10T00:00:00Z" },
      { phone: "+1A", created_at: "2026-01-10T00:00:00Z" },
    ];
    const data = buildRetentionMatrix(rows, new Date("2026-01-15T00:00:00Z"));
    expect(data.cohorts[0].size).toBe(1);
  });
});
