import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";

function getCipherKey(): Buffer {
  if (!env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  return createHash("sha256").update(env.ENCRYPTION_KEY).digest();
}

export function encryptSecret(value: string): {
  encryptedValue: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(
  encryptedValue: string,
  iv: string,
  authTag: string,
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getCipherKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
