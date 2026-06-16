import { describe, it, expect } from "vitest";
import { discountedInt } from "@/lib/catalog";

describe("discountedInt", () => {
  it("applies the discount and rounds to an integer", () => {
    expect(discountedInt("100.00", 0)).toBe(100);
    expect(discountedInt("100", 20)).toBe(80);
    expect(discountedInt(199.99, 0)).toBe(200);
    expect(discountedInt("100", 33)).toBe(67);
  });

  it("clamps the discount to 0..95", () => {
    expect(discountedInt("100", -10)).toBe(100);
    expect(discountedInt("100", 200)).toBe(5);
  });
});
