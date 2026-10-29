import bcrypt from "bcrypt";
import { getConfig } from "../../../Config/env.config.js";
export const hash = (value) => bcrypt.hash(value, getConfig().bcryptRounds);
export const compareTwoHashes = (hashedValue, value) =>
  bcrypt.compare(value, hashedValue);
