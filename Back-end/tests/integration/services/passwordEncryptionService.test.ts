import { describe, it, expect, vi } from "vitest";
import { encrypt, decrypt } from "../../../src/services/passwordEncryptionSercive.js";

// Helper to tamper with base64 strings
function flipBase64Byte(base64: string): string {
  const b = Buffer.from(base64, "base64");
  b[0] ^= 0xff; // flip a bit
  return b.toString("base64");
}

  const MODULE_PATH = "../../../src/services/passwordEncryptionSercive.js";

describe("passwordEncryptionService", () => {
  it("should throw if PENDING_ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("PENDING_ENCRYPTION_KEY", "");
    vi.stubEnv("CODE_SALT", "5");

    // Clear cached module so import() re-executes top-level code
    vi.resetModules();

    await expect(import(MODULE_PATH))
      .rejects
      .toThrow("Missing env variable PENDING_ENCRYPTION_KEY");

    vi.unstubAllEnvs();
  });

  it("should throw if CODE_SALT is missing", async () => {
    vi.stubEnv("PENDING_ENCRYPTION_KEY", "12345678901234567890123456789012"); // 32 bytes
    vi.stubEnv("CODE_SALT", "");

    vi.resetModules();

    await expect(import(MODULE_PATH))
      .rejects
      .toThrow("Missing env variable CODE_SALT");

    vi.unstubAllEnvs();
  });

  it("should throw if PENDING_ENCRYPTION_KEY is not 32 bytes", async () => {
    vi.stubEnv("PENDING_ENCRYPTION_KEY", "short_key"); // invalid
    vi.stubEnv("CODE_SALT", "10");

    vi.resetModules();

    await expect(import(MODULE_PATH))
      .rejects
      .toThrow(/must be 32 bytes/);

    vi.unstubAllEnvs();
  });
  it("encrypt() should return base64 encoded fields", () => {
    const payload = encrypt("hello world");

    expect(payload.encrypted).toBeTypeOf("string");
    expect(payload.iv).toBeTypeOf("string");
    expect(payload.tag).toBeTypeOf("string");

    expect(payload.encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(payload.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(payload.tag).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("decrypt() should return the original plaintext", () => {
    const plaintext = "my secret password";

    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("decrypt() should throw when ciphertext is tampered", () => {
    const payload = encrypt("test");

    const tampered = {
      ...payload,
      encrypted: flipBase64Byte(payload.encrypted),
    };

    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt() should throw when auth tag is tampered", () => {
    const payload = encrypt("test");

    const tampered = {
      ...payload,
      tag: flipBase64Byte(payload.tag),
    };

    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt() should throw when IV is tampered", () => {
    const payload = encrypt("test");

    const tampered = {
      ...payload,
      iv: flipBase64Byte(payload.iv),
    };

    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt() should throw on invalid base64 ciphertext", () => {
    const payload = encrypt("abc");

    const invalid = {
      ...payload,
      encrypted: "!!!NOT_BASE64!!!",
    };

    expect(() => decrypt(invalid)).toThrow();
  });

  it("decrypt() should throw on invalid base64 IV", () => {
    const payload = encrypt("abc");

    const invalid = {
      ...payload,
      iv: "NOT@@@BASE64",
    };

    expect(() => decrypt(invalid)).toThrow();
  });

  it("decrypt() should throw on invalid base64 tag", () => {
    const payload = encrypt("abc");

    const invalid = {
      ...payload,
      tag: "@@@@--notbase64",
    };

    expect(() => decrypt(invalid)).toThrow();
  });

  it("decrypt() should throw when required fields are missing", () => {
    const payload = encrypt("abc");

    // @ts-expect-error testing runtime behavior
    expect(() => decrypt({ encrypted: payload.encrypted })).toThrow();

    // Missing tag
    // @ts-expect-error testing runtime behavior
    expect(() => decrypt({ encrypted: payload.encrypted, iv: payload.iv })).toThrow();

    // Missing IV
    // @ts-expect-error testing runtime behavior
    expect(() => decrypt({ encrypted: payload.encrypted, tag: payload.tag })).toThrow();
  });


});
