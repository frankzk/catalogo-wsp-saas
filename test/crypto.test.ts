import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("AES-256-GCM crypto", () => {
  it("round-trips a secret", () => {
    const secret = "shpat_super_secret_token_123";
    const enc = encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(enc.split(".")).toHaveLength(3);
    expect(decrypt(enc)).toBe(secret);
  });

  it("uses a random IV (different ciphertext each time)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("throws when the ciphertext is tampered with", () => {
    const enc = encrypt("hello");
    const [iv, tag] = enc.split(".");
    const tampered = [iv, tag, Buffer.from("zzzzzz").toString("base64")].join(".");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on a malformed payload", () => {
    expect(() => decrypt("not-valid")).toThrow();
  });
});
