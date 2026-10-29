import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import {
  getConfig,
  validateConfig,
  configureRuntime,
} from "./Config/env.config.js";
import { connectDB } from "./DB/db.connection.js";
import User from "./DB/Models/user.model.js";
import Message from "./DB/Models/message.model.js";
import { connectRedis } from "./Config/redis.config.js";
import { createMailer } from "./Config/email.config.js";
async function main() {
  const config = getConfig();
  validateConfig(config);
  await connectDB();
  await Promise.all([User.init(), Message.init()]);
  const redis = await connectRedis();
  const mailer = createMailer();
  let verifyGoogle;
  if (config.googleClientId) {
    const client = new OAuth2Client(config.googleClientId);
    verifyGoogle = async (idToken) =>
      (
        await client.verifyIdToken({ idToken, audience: config.googleClientId })
      ).getPayload();
  }
  configureRuntime({ redis, mailer, verifyGoogle });
  const { createApp } = await import("./index.js");
  const server = createApp().listen(config.port, "127.0.0.1", () =>
    console.log("Saraha part 5 listening"),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () =>
      server.close(async () => {
        await redis.quit();
        await mongoose.disconnect();
        process.exit(0);
      }),
    );
}
main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
