import { getConfig } from "./env.config.js";
export const getDatabaseUri = () => getConfig().mongoUri;
