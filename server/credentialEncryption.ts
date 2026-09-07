import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function getKey() {
  const configured = process.env.TWITCH_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!configured) throw new Error("TWITCH_CREDENTIAL_ENCRYPTION_KEY is required");
  return createHash("sha256").update(configured, "utf8").digest();
}

export function encryptCredential(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptCredential(serialized: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = serialized.split(".");
  if (version !== VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Invalid encrypted credential format");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}
