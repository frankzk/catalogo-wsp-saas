import { describe, it, expect } from "vitest";
import { formatMoney, currencySymbol } from "@/lib/money";

describe("currencySymbol", () => {
  it("maps known currencies (case-insensitive)", () => {
    expect(currencySymbol("MXN")).toBe("$");
    expect(currencySymbol("PEN")).toBe("S/");
    expect(currencySymbol("eur")).toBe("€");
  });
  it("returns empty for unknown / null", () => {
    expect(currencySymbol("XYZ")).toBe("");
    expect(currencySymbol(null)).toBe("");
  });
});

describe("formatMoney", () => {
  it("applies the currency symbol and rounds to an integer", () => {
    expect(formatMoney(50, "MXN")).toBe("$50");
    expect(formatMoney(99.6, "MXN")).toBe("$100");
    expect(formatMoney(50, "PEN")).toBe("S/50");
  });
  it("groups large numbers (locale separator may be . or ,)", () => {
    expect(formatMoney(123456, "MXN")).toMatch(/^\$123[.,]456$/);
  });
  it("falls back to a currency-code suffix when unknown", () => {
    expect(formatMoney(50, "ABC")).toBe("50 ABC");
  });
  it("renders just the number when no currency is given", () => {
    expect(formatMoney(50, null)).toBe("50");
  });
});
