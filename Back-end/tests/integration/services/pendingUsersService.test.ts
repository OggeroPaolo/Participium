import { describe, it, expect, beforeEach, vi } from "vitest";

let savePendingUser: any;
let getPendingUser: any;
let updateCode: any;
let removePendingUser: any;

beforeEach(async () => {
  // Reset module cache
  vi.resetModules();

  // Re-import a fresh instance for each test
  const module = await import("../../../src/services/pendingUsersService.js");

  savePendingUser = module.savePendingUser;
  getPendingUser = module.getPendingUser;
  updateCode = module.updateCode;
  removePendingUser = module.removePendingUser;
});

describe("pendingUsersService", () => {
  it("should save and retrieve a pending user", () => {
    const email = "test@example.com";

    const pendingUser = {
      hashedCode: "hashed123",
      encryptedPassword: { encrypted: "abc", iv: "ivdata", tag: "tagdata" },
      userData: {
        firstName: "John",
        lastName: "Doe",
        username: "johnd",
        email
      },
      expiresAt: Date.now() + 30000
    };

    savePendingUser(email, pendingUser);

    const found = getPendingUser(email);
    expect(found).toEqual(pendingUser);
  });

  it("should return undefined for a missing user", () => {
    expect(getPendingUser("missing@example.com")).toBeUndefined();
  });

  it("should update the verification code", () => {
    const email = "code@example.com";

    const pendingUser = {
      hashedCode: "old",
      encryptedPassword: { encrypted: "x", iv: "y", tag: "z" },
      userData: {
        firstName: "Alice",
        lastName: "Smith",
        username: "alice",
        email
      },
      expiresAt: Date.now()
    };

    savePendingUser(email, pendingUser);

    updateCode(email, "newHash");

    const updated = getPendingUser(email);

    expect(updated!.hashedCode).toBe("newHash");
    expect(updated!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("should throw when updating missing user", () => {
    expect(() => updateCode("missing@example.com", "abc")).toThrow();
  });

  it("should remove a pending user", () => {
    const email = "remove@example.com";

    const pendingUser = {
      hashedCode: "old",
      encryptedPassword: { encrypted: "x", iv: "y", tag: "z" },
      userData: {
        firstName: "Jim",
        lastName: "Bean",
        username: "jimbean",
        email
      },
      expiresAt: Date.now()
    };

    savePendingUser(email, pendingUser);

    removePendingUser(email);

    expect(getPendingUser(email)).toBeUndefined();
  });
});
