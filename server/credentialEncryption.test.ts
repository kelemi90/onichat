import { describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "./credentialEncryption";

describe("credential encryption", () => {
  it("round-trips a Twitch refresh token with the configured server key", () => {
    const original = "refresh-token-test-value";
    const encrypted = encryptCredential(original);
    expect(encrypted).not.toContain(original);
    expect(decryptCredential(encrypted)).toBe(original);
  });
});
