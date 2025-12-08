import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../../src/services/passwordEncryptionSercive.js";


// Helper to tamper with base64 strings
function flipBase64Byte(base64: string): string {
  const b = Buffer.from(base64, "base64");
  b[0] ^= 0xff; // flip a bit
  return b.toString("base64");
}

describe("passwordEncryptionService", () => {
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
});
