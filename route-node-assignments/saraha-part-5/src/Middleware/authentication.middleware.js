import { decodeToken } from "../Common/Utils/Security/token.utils.js";
import { UnauthorizedException } from "../Common/Utils/Errors/exceptions.error.js";
export async function authenticate(req, res, next) {
  const match = /^Bearer (\S+)$/.exec(req.get("authorization") || "");
  if (!match) throw new UnauthorizedException("Bearer token required");
  const result = await decodeToken({ token: match[1] });
  req.authUser = result.user;
  req.accessTokenData = result.decoded;
  next();
}
