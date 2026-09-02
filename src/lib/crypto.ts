import crypto from "crypto";

const SECRET = process.env.APP_SECRET || "neural-ai-studio-default-secret-please-change-me";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

export function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

export function decrypt(payload: string) {
  try {
    const [ivHex, dataHex] = payload.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

export function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}
