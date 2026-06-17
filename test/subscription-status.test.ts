import { describe, it, expect } from "vitest";
import { isSubscriptionActive } from "@/lib/subscription-status";

describe("isSubscriptionActive", () => {
  it("grants access for active and trialing", () => {
    expect(isSubscriptionActive("active")).toBe(true);
    expect(isSubscriptionActive("trialing")).toBe(true);
  });

  it("cuts access for everything else", () => {
    for (const status of [
      "none",
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
      "",
      null,
      undefined,
    ]) {
      expect(isSubscriptionActive(status)).toBe(false);
    }
  });
});
