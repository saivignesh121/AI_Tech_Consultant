import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptSecret, decryptSecret } from "../src/lib/crypto";

const originalKey = process.env.ENCRYPTION_KEY;
const originalVersion = process.env.ENCRYPTION_KEY_VERSION;

describe("Encrypted secret envelope (AES-256-GCM)", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.ENCRYPTION_KEY_VERSION = "1";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
    if (originalVersion === undefined) delete process.env.ENCRYPTION_KEY_VERSION;
    else process.env.ENCRYPTION_KEY_VERSION = originalVersion;
  });

  it("round trips a secret with a versioned envelope", () => {
    const secret = "sk-ant-api03-roundtrip-1234";
    const record = encryptSecret(secret);

    expect(record.keyVersion).toBe("1");
    expect(record.iv).toHaveLength(24);
    expect(record.last4).toBe(secret.slice(-4));
    expect(JSON.stringify(record)).not.toContain(secret);
    expect(decryptSecret(record)).toBe(secret);
  });

  it("rejects a record encrypted with a different key version", () => {
    const record = encryptSecret("sk-ant-api03-version-test-1234");

    expect(() => decryptSecret({ ...record, keyVersion: "2" })).toThrow(
      /key version mismatch/i
    );
  });

  it("rejects tampered ciphertext", () => {
    const record = encryptSecret("AIzaSy-tamper-test-key-1234567890");
    const last = record.ciphertext.slice(-1);
    const tampered = {
      ...record,
      ciphertext: record.ciphertext.slice(0, -1) + (last === "0" ? "1" : "0"),
    };

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
