import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { getConfig } from "../../../Config/env.config.js";
import UserRepository from "../../../DB/Repositories/user.repository.js";
import { get } from "../Services/redis.service.js";
import { UnauthorizedException } from "../Errors/exceptions.error.js";
import { tokenTypeEnum } from "../../constants.js";
const userRepo = new UserRepository();
export const generateToken = (payload, signature, options = {}) =>
  jwt.sign(payload, signature, {
    algorithm: "HS256",
    jwtid: randomUUID(),
    ...options,
  });
export const verifyToken = (token, signature) =>
  jwt.verify(token, signature, { algorithms: ["HS256"] });
export function buildTokens(user) {
  const config = getConfig()[user.role];
  const payload = { _id: String(user._id), email: user.email, role: user.role };
  return {
    accessToken: generateToken(payload, config.accessSecret, {
      expiresIn: config.accessExpires,
    }),
    refreshToken: generateToken(payload, config.refreshSecret, {
      expiresIn: config.refreshExpires,
    }),
  };
}
export async function decodeToken({
  token,
  tokenType = tokenTypeEnum.ACCESS_TOKEN,
}) {
  let data;
  try {
    const hint = jwt.decode(token);
    if (!hint || !["user", "admin"].includes(hint.role)) throw new Error();
    const config = getConfig()[hint.role];
    data = verifyToken(
      token,
      tokenType === tokenTypeEnum.ACCESS_TOKEN
        ? config.accessSecret
        : config.refreshSecret,
    );
    if (typeof data.jti !== "string" || typeof data.exp !== "number")
      throw new Error();
  } catch {
    throw new UnauthorizedException("Invalid or expired token");
  }
  if (await get(`bl_${tokenType}_${data.jti}`))
    throw new UnauthorizedException("Token has been revoked");
  const user = await userRepo.findDocumentById(data._id);
  if (!user || user.role !== data.role)
    throw new UnauthorizedException("Invalid user");
  if (
    user.credentialsChangedAt &&
    data.iat * 1000 < user.credentialsChangedAt.getTime()
  )
    throw new UnauthorizedException("Credentials changed; sign in again");
  return { user, decoded: data };
}
