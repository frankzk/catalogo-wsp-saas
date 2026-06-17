import { describe, it, expect } from "vitest";
import {
  planTier,
  includedOrders,
  formatUsd,
  FREE_ORDER_LIMIT,
  PRO_INCLUDED_ORDERS,
  PRO_OVERAGE_RATE,
  PRO_PRICE_MONTHLY,
} from "@/lib/plans";

describe("planTier", () => {
  it("maps subscription status to a tier", () => {
    expect(planTier("active")).toBe("pro");
    expect(planTier("trialing")).toBe("pro");
    expect(planTier("none")).toBe("free");
    expect(planTier("past_due")).toBe("free");
    expect(planTier(null)).toBe("free");
  });
});

describe("includedOrders", () => {
  it("returns the right quota per tier", () => {
    expect(includedOrders("free")).toBe(FREE_ORDER_LIMIT);
    expect(includedOrders("pro")).toBe(PRO_INCLUDED_ORDERS);
  });
});

describe("formatUsd", () => {
  it("formats the plan amounts", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(PRO_PRICE_MONTHLY)).toBe("$4.90");
    expect(formatUsd(PRO_OVERAGE_RATE)).toBe("$0.05");
  });
});
