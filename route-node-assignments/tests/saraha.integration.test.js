const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
test(
  "Saraha end to end: email OTP, encrypted phone, login, rotation, revocation, ownership and image upload",
  { skip: !process.env.RUN_MEMORY_MONGO && !process.env.MONGO_URI },
  async () => {
    const memory = process.env.RUN_MEMORY_MONGO
      ? await require("../assignment-06-mongodb/node_modules/mongodb-memory-server").MongoMemoryServer.create(
          { instance: { args: ["--nounixsocket"] } },
        )
      : null;
    const mongoose = require("../saraha-app/node_modules/mongoose");
    const connection = await mongoose
      .createConnection(
        memory ? memory.getUri() + "saraha_test" : process.env.MONGO_URI,
        { dbName: "saraha_test_" + Date.now() },
      )
      .asPromise();
    const models = require("../saraha-app/src/models").defineModels(connection);
    await Promise.all(Object.values(models).map((m) => m.init()));
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "saraha-test-"));
    const mail = [];
    const cache = new Map();
    const redis = {
      get: async (key) => cache.get(key),
      set: async (key, value) => cache.set(key, value),
    };
    const config = {
      accessSecret: "access-secret-".repeat(4),
      refreshSecret: "refresh-secret-".repeat(4),
      phoneKey: "ab".repeat(32),
      otpPepper: "otp-pepper-".repeat(4),
      requireEmail: true,
      uploadDir,
      authRateLimit: 100,
    };
    const mailer = {
      sendMail: async (message) => {
        mail.push(message);
        return { messageId: "test" };
      },
    };
    const verifyGoogle = async (token) => {
      if (token !== "valid-google-id-token") throw new Error("Invalid token");
      return {
        sub: "google-user-123",
        email: "google@example.com",
        email_verified: true,
        given_name: "Google",
        family_name: "User",
      };
    };
    const server = require("../saraha-app/src/app")
      .createApp({ models, config, mailer, redis, verifyGoogle })
      .listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = "http://127.0.0.1:" + server.address().port;
    const req = async (method, url, body, status = 200, access) => {
      const r = await fetch(base + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: "Bearer " + access } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await r.json();
      assert.equal(r.status, status, JSON.stringify(data));
      return data;
    };
    const otp = () => mail.at(-1).text.match(/\b\d{6}\b/)[0];
    const signup = {
      firstName: "Ahmed",
      lastName: "Magdy",
      email: "ahmed@example.com",
      password: "StrongPass123!",
      confirmPassword: "StrongPass123!",
      phone: "01011111111",
      age: 25,
    };
    try {
      assert.equal((await req("GET", "/health")).status, "ok");
      await req("POST", "/auth/signup", { ...signup, role: "admin" }, 400);
      const created = await req("POST", "/auth/signup", signup, 201);
      assert.equal(created.user.fullName, "Ahmed Magdy");
      assert.equal(mail.length, 1);
      assert.ok(!JSON.stringify(created).includes("StrongPass"));
      let raw = await models.User.findById(created.user.id).select(
        "+password +phone",
      );
      assert.ok(raw.password.startsWith("$argon2id$"));
      assert.notEqual(raw.phone, signup.phone);
      await req("POST", "/auth/signup", signup, 409);
      await req(
        "POST",
        "/auth/login",
        { email: signup.email, password: signup.password },
        403,
      );
      await req(
        "POST",
        "/auth/confirm-email",
        { email: signup.email, otp: "000000" },
        400,
      );
      await req("POST", "/auth/confirm-email", {
        email: signup.email,
        otp: otp(),
      });
      await req(
        "POST",
        "/auth/confirm-email",
        { email: signup.email, otp: otp() },
        400,
      );
      await req(
        "POST",
        "/auth/login",
        { email: signup.email, password: "WrongPass123" },
        401,
      );
      let login = await req("POST", "/auth/login", {
        email: signup.email,
        password: signup.password,
      });
      assert.ok(login.accessToken);
      assert.equal(
        (await req("GET", "/users/profile", undefined, 200, login.accessToken))
          .phone,
        signup.phone,
      );
      await req("GET", "/users/profile", undefined, 401, login.refreshToken);
      await req("GET", "/admin/users", undefined, 403, login.accessToken);
      await req(
        "PATCH",
        "/users/profile",
        { firstName: "Updated", role: "admin" },
        400,
        login.accessToken,
      );
      assert.equal(
        (
          await req(
            "PATCH",
            "/users/profile",
            { firstName: "Updated" },
            200,
            login.accessToken,
          )
        ).firstName,
        "Updated",
      );
      const pub = await req("GET", "/users/public/" + created.user.id);
      assert.ok(!pub.email);
      assert.ok(!pub.phone);
      const note = await req(
        "POST",
        "/messages/" + created.user.id,
        { content: "Anonymous hello" },
        201,
      );
      assert.equal(
        (
          await req(
            "GET",
            "/messages?page=1&limit=2",
            undefined,
            200,
            login.accessToken,
          )
        ).total,
        1,
      );
      const google = await req("POST", "/auth/google", {
        idToken: "valid-google-id-token",
      });
      await req("POST", "/auth/google", { idToken: "bad" }, 401);
      await req(
        "DELETE",
        "/messages/" + note.id,
        undefined,
        404,
        google.accessToken,
      );
      await req(
        "DELETE",
        "/messages/" + note.id,
        undefined,
        200,
        login.accessToken,
      );
      const sharp = require("../saraha-app/node_modules/sharp");
      const image = await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#007bff" },
      })
        .png()
        .toBuffer();
      const form = new FormData();
      form.append(
        "avatar",
        new Blob([image], { type: "image/png" }),
        "../../avatar.png",
      );
      let r = await fetch(base + "/users/profile/avatar", {
        method: "POST",
        headers: { Authorization: "Bearer " + login.accessToken },
        body: form,
      });
      assert.equal(r.status, 200, await r.clone().text());
      const avatar = (await r.json()).avatar;
      assert.match(avatar, /^\/uploads\/[0-9a-f-]+\.png$/);
      assert.equal((await fetch(base + avatar)).status, 200);
      const fake = new FormData();
      fake.append(
        "avatar",
        new Blob(["fake image"], { type: "image/png" }),
        "fake.png",
      );
      r = await fetch(base + "/users/profile/avatar", {
        method: "POST",
        headers: { Authorization: "Bearer " + login.accessToken },
        body: fake,
      });
      assert.equal(r.status, 400);
      const old = login;
      login = await req("POST", "/auth/refresh", {
        refreshToken: login.refreshToken,
      });
      await req(
        "POST",
        "/auth/refresh",
        { refreshToken: old.refreshToken },
        401,
      );
      await req("GET", "/users/profile", undefined, 401, old.accessToken);
      await req("POST", "/auth/logout", {}, 200, login.accessToken);
      await req("GET", "/users/profile", undefined, 401, login.accessToken);
      assert.ok(cache.size >= 2);
      login = await req("POST", "/auth/login", {
        email: signup.email,
        password: signup.password,
      });
      await req("POST", "/auth/forgot-password", { email: signup.email });
      await req("POST", "/auth/reset-password", {
        email: signup.email,
        otp: otp(),
        password: "NewStrongPass123!",
      });
      await req("GET", "/users/profile", undefined, 401, login.accessToken);
      await req(
        "POST",
        "/auth/login",
        { email: signup.email, password: signup.password },
        401,
      );
      login = await req("POST", "/auth/login", {
        email: signup.email,
        password: "NewStrongPass123!",
      });
      await req(
        "PATCH",
        "/users/password",
        {
          currentPassword: "NewStrongPass123!",
          password: "FinalStrongPass123!",
        },
        200,
        login.accessToken,
      );
      await req("GET", "/users/profile", undefined, 401, login.accessToken);
      login = await req("POST", "/auth/login", {
        email: signup.email,
        password: "FinalStrongPass123!",
      });
      await req("DELETE", "/users/profile", undefined, 200, login.accessToken);
      await req("GET", "/users/profile", undefined, 401, login.accessToken);
      assert.equal(await models.User.findById(created.user.id), null);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await connection.dropDatabase();
      await connection.close();
      if (memory) await memory.stop();
      await fs.rm(uploadDir, { recursive: true, force: true });
    }
  },
);
