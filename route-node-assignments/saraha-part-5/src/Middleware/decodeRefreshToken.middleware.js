import { decodeToken } from "../Common/Utils/Security/token.utils.js";
import { tokenTypeEnum } from "../Common/constants.js";
export async function decodeRefreshToken(req, res, next) {
  const result = await decodeToken({
    token: req.validate.refreshToken,
    tokenType: tokenTypeEnum.REFRESH_TOKEN,
  });
  req.refreshTokenData = result.decoded;
  req.refreshUser = result.user;
  next();
}
