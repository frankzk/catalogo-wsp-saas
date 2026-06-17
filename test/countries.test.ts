import { describe, it, expect } from "vitest";
import {
  toE164,
  isValidNationalNumber,
  countryByCode,
} from "@/lib/countries";

describe("toE164", () => {
  it("builds an E.164 number stripping non-digits", () => {
    expect(toE164("52", "55 1234 5678")).toBe("+525512345678");
  });
});

describe("isValidNationalNumber", () => {
  it("validates against the country's expected length", () => {
    const mx = countryByCode("MX")!;
    expect(isValidNationalNumber(mx, "5512345678")).toBe(true);
    expect(isValidNationalNumber(mx, "551234")).toBe(false);
  });
});

describe("countryByCode", () => {
  it("is case-insensitive and tolerates null", () => {
    expect(countryByCode("mx")?.code).toBe("MX");
    expect(countryByCode(null)).toBeUndefined();
  });
});
