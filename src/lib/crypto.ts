import crypto from "crypto";

// AES-256-GCM with a fresh 12-byte IV per record and a version tag stored
// alongside the ciphertext so keys can be rotated.
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error("ENCRYPTION_KEY must be set to 64 hex characters");
  }
  return Buffer.from(hexKey, "hex");
}

function getKeyVersion(): string {
  return process.env.ENCRYPTION_KEY_VERSION || "1";
}

export interface EncryptedSecret {
  keyVersion: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  last4: string;
}

/** Encrypt a secret into a versioned envelope. Never logs the plaintext. */
export function encryptSecret(plainText: string): EncryptedSecret {
  if (!plainText) {
    throw new Error("Cannot encrypt an empty secret");
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext =
    cipher.update(plainText, "utf8", "hex") + cipher.final("hex");

  return {
    keyVersion: getKeyVersion(),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
    ciphertext,
    last4: plainText.slice(-4),
  };
}

function decodeSecret(value: EncryptedSecret | string): EncryptedSecret {
  if (typeof value !== "string") return value;

  // Legacy rows stored "iv:tag:ciphertext" under key version 1.
  if (!value.startsWith("{")) {
    const [iv, authTag, ciphertext] = value.split(":");
    if (!iv || !authTag || !ciphertext) {
      throw new Error("Invalid encrypted secret format");
    }
    return { keyVersion: "1", iv, authTag, ciphertext, last4: "" };
  }

  const parsed = JSON.parse(value) as EncryptedSecret;
  if (!parsed.iv || !parsed.authTag || !parsed.ciphertext || !parsed.keyVersion) {
    throw new Error("Invalid encrypted secret format");
  }
  return parsed;
}

/** Decrypt a versioned envelope (or a legacy string). Never logs the secret. */
export function decryptSecret(value: EncryptedSecret | string): string {
  const record = decodeSecret(value);
  if (record.keyVersion !== getKeyVersion()) {
    throw new Error("Encryption key version mismatch");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(record.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(record.authTag, "hex"));
  return (
    decipher.update(record.ciphertext, "hex", "utf8") +
    decipher.final("utf8")
  );
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
