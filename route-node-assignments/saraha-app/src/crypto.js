const {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  timingSafeEqual,
  randomInt,
} = require("node:crypto");
function cryptoTools(key, pepper) {
  const encryptionKey = Buffer.from(key, "hex");
  if (encryptionKey.length !== 32)
    throw new Error("PHONE_ENCRYPTION_KEY must be 64 hex characters");
  return {
    encrypt(value) {
      if (!value) return undefined;
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
      ]);
      return [
        iv.toString("hex"),
        cipher.getAuthTag().toString("hex"),
        encrypted.toString("hex"),
      ].join(":");
    },
    decrypt(value) {
      if (!value) return undefined;
      const [iv, tag, data] = value.split(":");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        Buffer.from(iv, "hex"),
      );
      decipher.setAuthTag(Buffer.from(tag, "hex"));
      return Buffer.concat([
        decipher.update(Buffer.from(data, "hex")),
        decipher.final(),
      ]).toString("utf8");
    },
    newOtp() {
      return String(randomInt(100000, 1000000));
    },
    otpHash(value) {
      return createHash("sha256")
        .update(pepper + ":" + value)
        .digest("hex");
    },
    compareHash(a, b) {
      const left = Buffer.from(a, "hex"),
        right = Buffer.from(b, "hex");
      return left.length === right.length && timingSafeEqual(left, right);
    },
  };
}
module.exports = { cryptoTools };
