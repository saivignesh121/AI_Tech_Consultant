import crypto from "crypto";

// 32-byte key for AES-256-GCM
const DEFAULT_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  return Buffer.from(hexKey.slice(0, 64), "hex");
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts sensitive credentials using AES-256-GCM.
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  // Format: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted credentials.
 */
export function decryptCredential(cipherPackage: string): string {
  if (!cipherPackage) return "";
  const parts = cipherPackage.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credential format");
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Masks an API key for safe UI display (e.g., sk-ant-••••••1234).
 */
export function maskApiKey(apiKey: string | null | undefined): string {
  if (!apiKey) return "Not Configured";
  if (apiKey.length <= 8) return "••••••••";
  const start = apiKey.slice(0, 7);
  const end = apiKey.slice(-4);
  return `${start}••••••••${end}`;
}
