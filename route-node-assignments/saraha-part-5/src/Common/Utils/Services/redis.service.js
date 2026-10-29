import { getDependencies } from "../../../Config/env.config.js";
import HttpAppError from "../Errors/app.error.js";
const client = () => {
  const redis = getDependencies().redis;
  if (!redis) throw new HttpAppError("Redis is not configured", 503);
  return redis;
};
export const get = (key) => client().get(key);
export const set = ({ key, value, options }) =>
  client().set(key, String(value), options);
export const del = (key) => client().del(key);
export const calculateTTL = (expiration) =>
  Math.max(1, Math.ceil(expiration - Date.now() / 1000));
// Keep Redis operations explicit, as in the session service wrapper.
export async function registerOTPAttempt(key) {
  const count = await client().incr(key + ":attempts");
  if (count === 1) await client().expire(key + ":attempts", 600);
  return count <= 5;
}
