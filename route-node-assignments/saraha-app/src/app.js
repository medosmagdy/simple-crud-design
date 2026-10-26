const express = require("express");
const argon2 = require("argon2");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const multer = require("multer");
const sharp = require("sharp");
const { AppError } = require("./errors");
const { Repository } = require("./repository");
const { cryptoTools } = require("./crypto");
const { tokenService } = require("./tokens");
const v = require("./validation");
function createApp({ models, config, mailer, redis, verifyGoogle }) {
  const { User, Message, Session } = models;
  const users = new Repository(User);
  const messages = new Repository(Message);
  const crypto = cryptoTools(config.phoneKey, config.otpPepper);
  const tokens = tokenService(Session, config, redis);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit || 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.use("/auth", authLimit);
  const id = (value) => v.parse(v.objectId, value);
  const publicUser = (user) => ({
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    age: user.age,
    role: user.role,
    emailConfirmed: user.emailConfirmed,
    avatar: user.avatar,
  });
  async function authenticate(req, res, next) {
    const match = /^Bearer (\S+)$/.exec(req.get("authorization") || "");
    if (!match) throw new AppError(401, "Bearer access token required");
    const payload = tokens.verify(match[1], "access");
    await tokens.active(payload);
    const user = await users.findById(payload.sub);
    if (!user) throw new AppError(401, "User no longer exists");
    req.user = user;
    req.auth = payload;
    next();
  }
  async function sendOtp(user, purpose) {
    if (!mailer) throw new AppError(503, "SMTP is not configured");
    const otp = crypto.newOtp();
    await users.updateOne(
      { _id: user._id },
      {
        otpHash: crypto.otpHash(otp),
        otpPurpose: purpose,
        otpExpires: new Date(Date.now() + 10 * 60000),
        otpAttempts: 0,
      },
    );
    await mailer.sendMail({
      to: user.email,
      subject:
        purpose === "confirm"
          ? "Confirm your Saraha email"
          : "Reset your Saraha password",
      text: "Your verification code is " + otp + ". It expires in 10 minutes.",
    });
  }
  async function checkOtp(email, otp, purpose) {
    const user = await users.findOne(
      { email },
      "+otpHash +otpPurpose +otpExpires +otpAttempts",
    );
    if (
      !user ||
      user.otpPurpose !== purpose ||
      !user.otpHash ||
      !user.otpExpires ||
      user.otpExpires < Date.now() ||
      user.otpAttempts >= 5
    )
      throw new AppError(400, "Invalid or expired code");
    // Conditional update makes code consumption single-use even under concurrent requests.
    if (!crypto.compareHash(user.otpHash, crypto.otpHash(otp))) {
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
      throw new AppError(400, "Invalid or expired code");
    }
    const consumed = await User.findOneAndUpdate(
      {
        _id: user._id,
        otpHash: user.otpHash,
        otpPurpose: purpose,
        otpAttempts: { $lt: 5 },
        otpExpires: { $gt: new Date() },
      },
      {
        $unset: { otpHash: 1, otpPurpose: 1, otpExpires: 1 },
        $set: { otpAttempts: 0 },
      },
      { new: true },
    );
    if (!consumed) throw new AppError(400, "Code already used");
    return consumed;
  }
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.post("/auth/signup", async (req, res) => {
    const data = v.parse(v.signup, req.body);
    if (await users.findOne({ email: data.email }))
      throw new AppError(409, "Email already exists");
    if (config.requireEmail && !mailer)
      throw new AppError(503, "Configure SMTP before signup");
    const user = await users.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: await argon2.hash(data.password, { type: argon2.argon2id }),
      phone: crypto.encrypt(data.phone),
      age: data.age,
      emailConfirmed: !config.requireEmail,
    });
    if (config.requireEmail) await sendOtp(user, "confirm");
    res
      .status(201)
      .json({
        user: publicUser(user),
        message: config.requireEmail
          ? "Check your email for the verification code"
          : "User created",
      });
  });
  app.post("/auth/confirm-email", async (req, res) => {
    const data = v.parse(v.otp, req.body);
    const user = await checkOtp(data.email, data.otp, "confirm");
    await users.updateOne({ _id: user._id }, { emailConfirmed: true });
    res.json({ message: "Email confirmed" });
  });
  app.post("/auth/resend-confirmation", async (req, res) => {
    const { email } = v.parse(v.z.strictObject({ email: v.email }), req.body);
    const user = await users.findOne({ email });
    if (user && !user.emailConfirmed) await sendOtp(user, "confirm");
    res.json({ message: "If eligible, a verification email has been sent" });
  });
  app.post("/auth/login", async (req, res) => {
    const data = v.parse(v.login, req.body);
    const user = await users.findOne({ email: data.email }, "+password");
    if (
      !user ||
      user.provider !== "local" ||
      !user.password ||
      !(await argon2.verify(user.password, data.password))
    )
      throw new AppError(401, "Invalid email or password");
    if (config.requireEmail && !user.emailConfirmed)
      throw new AppError(403, "Confirm email first");
    res.json({ ...(await tokens.issue(user)), user: publicUser(user) });
  });
  app.post("/auth/refresh", async (req, res) => {
    const { refreshToken } = v.parse(
      v.z.strictObject({ refreshToken: v.z.string().min(1) }),
      req.body,
    );
    const payload = tokens.verify(refreshToken, "refresh");
    const user = await users.findById(payload.sub);
    if (!user) throw new AppError(401, "User no longer exists");
    await tokens.consume(payload);
    res.json(await tokens.issue(user));
  });
  app.post("/auth/logout", authenticate, async (req, res) => {
    await tokens.revoke(req.auth);
    res.json({ message: "Logged out; both tokens revoked" });
  });
  app.post("/auth/forgot-password", async (req, res) => {
    const { email } = v.parse(v.z.strictObject({ email: v.email }), req.body);
    const user = await users.findOne({ email, provider: "local" });
    if (user) await sendOtp(user, "reset");
    res.json({ message: "If the account exists, a reset email has been sent" });
  });
  app.post("/auth/reset-password", async (req, res) => {
    const data = v.parse(
      v.z.strictObject({
        email: v.email,
        otp: v.z.string().regex(/^\d{6}$/),
        password: v.password,
      }),
      req.body,
    );
    const user = await checkOtp(data.email, data.otp, "reset");
    await users.updateOne(
      { _id: user._id },
      { password: await argon2.hash(data.password, { type: argon2.argon2id }) },
    );
    await Session.deleteMany({ userId: user._id });
    res.json({ message: "Password reset; all sessions revoked" });
  });
  app.post("/auth/google", async (req, res) => {
    const { idToken } = v.parse(
      v.z.strictObject({ idToken: v.z.string().min(1) }),
      req.body,
    );
    if (!verifyGoogle)
      throw new AppError(503, "Google client ID is not configured");
    let info;
    try {
      info = await verifyGoogle(idToken);
    } catch {
      throw new AppError(401, "Invalid Google ID token");
    }
    if (!info?.sub || !info.email_verified || !info.email)
      throw new AppError(401, "Verified Google email required");
    let user = await users.findOne({ googleId: info.sub });
    if (!user) {
      if (await users.findOne({ email: info.email.toLowerCase() }))
        throw new AppError(
          409,
          "Existing account: sign in with its original method",
        );
      user = await users.create({
        firstName: info.given_name || "Google",
        lastName: info.family_name || "User",
        email: info.email.toLowerCase(),
        googleId: info.sub,
        provider: "google",
        emailConfirmed: true,
      });
    }
    res.json({ ...(await tokens.issue(user)), user: publicUser(user) });
  });
  app.get("/users/profile", authenticate, async (req, res) => {
    const user = await users.findById(req.user._id, "+phone");
    res.json({ ...publicUser(user), phone: crypto.decrypt(user.phone) });
  });
  app.patch("/users/profile", authenticate, async (req, res) => {
    const data = v.parse(v.profile, req.body);
    if (data.phone) data.phone = crypto.encrypt(data.phone);
    const user = await users.updateOne({ _id: req.user._id }, data);
    res.json(publicUser(user));
  });
  app.patch("/users/password", authenticate, async (req, res) => {
    const { currentPassword, password } = v.parse(
      v.z.strictObject({ currentPassword: v.password, password: v.password }),
      req.body,
    );
    const user = await users.findById(req.user._id, "+password");
    if (
      !user.password ||
      !(await argon2.verify(user.password, currentPassword))
    )
      throw new AppError(401, "Current password incorrect");
    await users.updateOne(
      { _id: user._id },
      { password: await argon2.hash(password, { type: argon2.argon2id }) },
    );
    await Session.deleteMany({ userId: user._id });
    res.json({ message: "Password updated; sign in again" });
  });
  app.delete("/users/profile", authenticate, async (req, res) => {
    await messages.model.deleteMany({ recipient: req.user._id });
    await Session.deleteMany({ userId: req.user._id });
    await users.deleteOne({ _id: req.user._id });
    res.json({ message: "Account deleted" });
  });
  app.get("/users/public/:id", async (req, res) => {
    const user = await users.findById(id(req.params.id));
    if (!user) throw new AppError(404, "User not found");
    res.json({
      id: String(user._id),
      fullName: user.fullName,
      avatar: user.avatar,
    });
  });
  app.get("/admin/users", authenticate, async (req, res) => {
    if (req.user.role !== "admin")
      throw new AppError(403, "Admin role required");
    res.json({
      users: await User.find()
        .select("firstName lastName email role")
        .limit(100),
    });
  });
  const messageLimit = rateLimit({
    windowMs: 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.post("/messages/:recipientId", messageLimit, async (req, res) => {
    const recipient = id(req.params.recipientId);
    const { content } = v.parse(
      v.z.strictObject({ content: v.z.string().trim().min(1).max(1000) }),
      req.body,
    );
    if (!(await users.findById(recipient)))
      throw new AppError(404, "Recipient not found");
    const message = await messages.create({ content, recipient });
    res
      .status(201)
      .json({ message: "Anonymous message sent", id: message._id });
  });
  app.get("/messages", authenticate, async (req, res) => {
    const page = Number(req.query.page || 1),
      limit = Number(req.query.limit || 10);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new AppError(400, "Invalid pagination");
    res.json({
      page,
      limit,
      total: await Message.countDocuments({ recipient: req.user._id }),
      messages: await Message.find({ recipient: req.user._id })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    });
  });
  app.delete("/messages/:id", authenticate, async (req, res) => {
    const message = await messages.deleteOne({
      _id: id(req.params.id),
      recipient: req.user._id,
    });
    if (!message) throw new AppError(404, "Message not found");
    res.json({ message: "Message deleted" });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: 2 * 1024 * 1024, fields: 0, parts: 1 },
    fileFilter(req, file, cb) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimetype))
        return cb(new AppError(400, "PNG, JPEG or WebP required"));
      cb(null, true);
    },
  });
  const uploadDir = config.uploadDir || path.join(__dirname, "../uploads");
  app.post(
    "/users/profile/avatar",
    authenticate,
    upload.single("avatar"),
    async (req, res) => {
      if (!req.file) throw new AppError(400, "avatar required");
      const { fileTypeFromBuffer } = await import("file-type");
      const type = await fileTypeFromBuffer(req.file.buffer);
      if (
        !type ||
        !["image/png", "image/jpeg", "image/webp"].includes(type.mime)
      )
        throw new AppError(400, "Invalid image content");
      let buffer;
      try {
        buffer = await sharp(req.file.buffer, { limitInputPixels: 20000000 })
          .rotate()
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
      } catch {
        throw new AppError(400, "Image could not be decoded");
      }
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = randomUUID() + ".png";
      const target = path.join(uploadDir, filename);
      try {
        await fs.writeFile(target, buffer, { flag: "wx" });
        const user = await users.updateOne(
          { _id: req.user._id },
          { avatar: "/uploads/" + filename },
        );
        if (!user) throw new AppError(404, "User no longer exists");
        res.json({ avatar: user.avatar });
      } catch (e) {
        await fs.unlink(target).catch(() => {});
        throw e;
      }
    },
  );
  app.use(
    "/uploads",
    express.static(uploadDir, {
      index: false,
      dotfiles: "deny",
      setHeaders(res) {
        res.set("X-Content-Type-Options", "nosniff");
      },
    }),
  );
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((e, req, res, next) => {
    const status =
      e.status ||
      (e.code === 11000
        ? 409
        : e.name === "ValidationError" || e.name === "CastError"
          ? 400
          : e instanceof multer.MulterError
            ? e.code === "LIMIT_FILE_SIZE"
              ? 413
              : 400
            : 500);
    res
      .status(status)
      .json({
        message:
          status === 500
            ? "Internal server error"
            : e.code === 11000
              ? "Email or provider already exists"
              : e.message,
      });
  });
  return app;
}
module.exports = { createApp };
