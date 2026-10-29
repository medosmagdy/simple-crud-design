import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { getConfig } from "../../../Config/env.config.js";
export function encrypt(value) {
  const key = Buffer.from(getConfig().phoneKey, "hex"),
    iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    data.toString("hex"),
  ].join(":");
}
export function decrypt(value) {
  if (!value) return undefined;
  const [iv, tag, data] = value.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(getConfig().phoneKey, "hex"),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
