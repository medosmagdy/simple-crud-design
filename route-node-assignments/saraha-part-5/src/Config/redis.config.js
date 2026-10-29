import { createClient } from "redis";
import { getConfig } from "./env.config.js";
export async function connectRedis() {
  if (!getConfig().redisUrl) throw new Error("Configure REDIS_URL");
  const client = createClient({ url: getConfig().redisUrl });
  client.on("error", () => console.error("Redis connection error"));
  await client.connect();
  return client;
}
