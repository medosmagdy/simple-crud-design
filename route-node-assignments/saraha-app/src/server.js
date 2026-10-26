const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { createClient } = require("redis");
const { OAuth2Client } = require("google-auth-library");
const { defineModels } = require("./models");
const { createApp } = require("./app");
async function main() {
  const env = process.env;
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "OTP_PEPPER"])
    if (!env[key] || env[key].length < 32 || env[key].startsWith("replace-"))
      throw new Error("Configure " + key + " with a random secret");
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
    throw new Error("Access and refresh secrets must differ");
  if (!/^[0-9a-fA-F]{64}$/.test(env.PHONE_ENCRYPTION_KEY || ""))
    throw new Error("Configure PHONE_ENCRYPTION_KEY (32 random bytes as hex)");
  const connection = await mongoose
    .createConnection(env.MONGO_URI || "mongodb://127.0.0.1:27017/route_saraha")
    .asPromise();
  const models = defineModels(connection);
  await Promise.all(Object.values(models).map((m) => m.init()));
  let redis;
  if (env.REDIS_URL) {
    redis = createClient({ url: env.REDIS_URL });
    redis.on("error", (e) => console.error("Redis error:", e.message));
    await redis.connect();
  }
  let mailer;
  if (env.SMTP_HOST && env.MAIL_FROM) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === "true",
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
    });
    mailer = {
      sendMail: (message) =>
        transport.sendMail({ from: env.MAIL_FROM, ...message }),
    };
  }
  let verifyGoogle;
  if (env.GOOGLE_CLIENT_ID) {
    const google = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    verifyGoogle = async (token) =>
      (
        await google.verifyIdToken({
          idToken: token,
          audience: env.GOOGLE_CLIENT_ID,
        })
      ).getPayload();
  }
  const config = {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    phoneKey: env.PHONE_ENCRYPTION_KEY,
    otpPepper: env.OTP_PEPPER,
    requireEmail: env.REQUIRE_EMAIL_CONFIRMATION !== "false",
  };
  const server = createApp({
    models,
    config,
    mailer,
    redis,
    verifyGoogle,
  }).listen(Number(env.PORT || 3008), "127.0.0.1", () =>
    console.log("Saraha API listening on localhost"),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () =>
      server.close(async () => {
        await connection.close();
        if (redis) await redis.quit();
        process.exit(0);
      }),
    );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
