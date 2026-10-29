import dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE || ".env", quiet: true });
export function readEnv(env = process.env) {
  return {
    port: Number(env.PORT || 3008),
    mongoUri: env.MONGO_URI || "mongodb://127.0.0.1:27017/route_saraha_part5",
    redisUrl: env.REDIS_URL,
    phoneKey: env.PHONE_ENCRYPTION_KEY,
    bcryptRounds: Number(env.BCRYPT_ROUNDS || 12),
    uploadRoot: env.UPLOAD_ROOT,
    user: {
      accessSecret: env.USER_ACCESS_TOKEN_SECRET,
      refreshSecret: env.USER_REFRESH_TOKEN_SECRET,
      accessExpires: Number(env.USER_ACCESS_TOKEN_EXPIRES_IN || 900),
      refreshExpires: Number(env.USER_REFRESH_TOKEN_EXPIRES_IN || 604800),
    },
    admin: {
      accessSecret: env.ADMIN_ACCESS_TOKEN_SECRET,
      refreshSecret: env.ADMIN_REFRESH_TOKEN_SECRET,
      accessExpires: 900,
      refreshExpires: 604800,
    },
    smtp: {
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === "true",
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.MAIL_FROM,
    },
    googleClientId: env.GOOGLE_CLIENT_ID,
  };
}
let config = readEnv();
let dependencies = {};
export function configureRuntime(options) {
  if (options.config) config = options.config;
  dependencies = { ...dependencies, ...options };
}
export const getConfig = () => config;
export const getDependencies = () => dependencies;
export function validateConfig(value) {
  const secrets = [
    value.user.accessSecret,
    value.user.refreshSecret,
    value.admin.accessSecret,
    value.admin.refreshSecret,
  ];
  if (
    secrets.some((s) => typeof s !== "string" || s.length < 32) ||
    new Set(secrets).size !== 4
  )
    throw new Error(
      "Configure four distinct JWT secrets of at least 32 characters",
    );
  if (!/^[a-fA-F0-9]{64}$/.test(value.phoneKey || ""))
    throw new Error("PHONE_ENCRYPTION_KEY must be 64 hex characters");
  if (
    !Number.isInteger(value.bcryptRounds) ||
    value.bcryptRounds < 10 ||
    value.bcryptRounds > 15
  )
    throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15");
}
