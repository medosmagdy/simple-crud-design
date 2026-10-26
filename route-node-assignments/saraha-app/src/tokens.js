const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const { AppError } = require("./errors");
function tokenService(Session, config, redis) {
  const key = (type) =>
    type === "access" ? config.accessSecret : config.refreshSecret;
  const verify = (token, type) => {
    try {
      const payload = jwt.verify(token, key(type), {
        algorithms: ["HS256"],
        issuer: "route-saraha",
        audience: "route-saraha-client",
      });
      if (payload.type !== type) throw new Error("Wrong token type");
      return payload;
    } catch {
      throw new AppError(401, "Invalid or expired token");
    }
  };
  const sign = (user, session, type) =>
    jwt.sign({ type, sid: session.jti }, key(type), {
      algorithm: "HS256",
      subject: String(user._id),
      jwtid: randomUUID(),
      expiresIn: type === "access" ? "15m" : "7d",
      issuer: "route-saraha",
      audience: "route-saraha-client",
    });
  async function issue(user) {
    const session = await Session.create({
      jti: randomUUID(),
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    return {
      accessToken: sign(user, session, "access"),
      refreshToken: sign(user, session, "refresh"),
    };
  }
  async function active(payload) {
    if (redis && (await redis.get("revoked:" + payload.sid)))
      throw new AppError(401, "Session revoked");
    const session = await Session.findOne({
      jti: payload.sid,
      userId: payload.sub,
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw new AppError(401, "Session expired or revoked");
    return session;
  }
  async function revoke(payload) {
    await Session.deleteOne({ jti: payload.sid, userId: payload.sub });
    if (redis)
      await redis.set("revoked:" + payload.sid, "1", { EX: 7 * 86400 });
  }
  async function consume(payload) {
    const session = await Session.findOneAndDelete({
      jti: payload.sid,
      userId: payload.sub,
      expiresAt: { $gt: new Date() },
    });
    if (!session)
      throw new AppError(401, "Refresh token already used or revoked");
    if (redis)
      await redis.set("revoked:" + payload.sid, "1", { EX: 7 * 86400 });
  }
  return { verify, issue, active, revoke, consume };
}
module.exports = { tokenService };
