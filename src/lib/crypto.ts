import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for secrets at rest (Shopify access tokens, Telegram
 * bot tokens). Node runtime only — routes that use this must set
 * `export const runtime = "nodejs"`.
 *
 * Encrypted format:  base64(iv) "." base64(authTag) "." base64(ciphertext)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce is recommended for GCM

function getKey(): Buffer {
  const raw = serverEnv().tokenEncryptionKey;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must decode to 32 bytes. Generate one with: openssl rand -base64 32",
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload format");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
