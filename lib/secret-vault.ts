import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function getVaultKey() {
  const secret = process.env.APP_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET or NEXTAUTH_SECRET is required to encrypt provider keys.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted secret format.");
  }
  const decipher = crypto.createDecipheriv(algorithm, getVaultKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

export function secretLast4(value: string) {
  return value.slice(-4);
}
