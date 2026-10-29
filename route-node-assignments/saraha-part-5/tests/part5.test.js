import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createClient } from "redis";
import User from "../src/DB/Models/user.model.js";
import Message from "../src/DB/Models/message.model.js";
import { readEnv, configureRuntime } from "../src/Config/env.config.js";
import { createApp } from "../src/index.js";
import { signupSchema } from "../src/Modules/Auth/auth.validation.js";
import { profileSchema } from "../src/Modules/User/user.validation.js";
import { validation } from "../src/Middleware/validation.middleware.js";
import { compareTwoHashes } from "../src/Common/Utils/Security/hash.security.js";

test("Validation follows middleware contract and rejects unknown fields", () => {
  const data = {
    firstName: "Muhammad",
    lastName: "Magdy",
    email: "student@example.com",
    password: "StrongPass123!",
    confirmPassword: "StrongPass123!",
    gender: "male",
    age: 25,
  };
  const req = { body: data };
  let called = false;
  validation(signupSchema)(req, {}, () => (called = true));
  assert.ok(called);
  assert.equal(req.validate.email, data.email);
  assert.equal(
    signupSchema.safeParse({ ...data, role: "admin" }).success,
    false,
  );
  assert.equal(
    signupSchema.safeParse({ ...data, confirmPassword: "wrong" }).success,
    false,
  );
  assert.equal(signupSchema.safeParse({ ...data, age: 61 }).success, false);
  assert.ok(profileSchema.safeParse({ firstName: "Updated" }).success);
});

test(
  "Part 5: real MongoDB/Redis signup, OTP, JWT blacklist and disk profile upload",
  { skip: !process.env.REDIS_TEST_URL },
  async () => {
    const mongo = await MongoMemoryServer.create({
      instance: { args: ["--nounixsocket"] },
    });
    await mongoose.connect(mongo.getUri(), { dbName: "part5_" + Date.now() });
    await Promise.all([User.init(), Message.init()]);
    const redis = createClient({ url: process.env.REDIS_TEST_URL });
    await redis.connect();
    const root = await mkdtemp(path.join(tmpdir(), "part5-"));
    const outbox = [];
    const config = readEnv({
      USER_ACCESS_TOKEN_SECRET: "user-access-".repeat(4),
      USER_REFRESH_TOKEN_SECRET: "user-refresh-".repeat(4),
      ADMIN_ACCESS_TOKEN_SECRET: "admin-access-".repeat(4),
      ADMIN_REFRESH_TOKEN_SECRET: "admin-refresh-".repeat(4),
      PHONE_ENCRYPTION_KEY: "ab".repeat(32),
      BCRYPT_ROUNDS: "10",
      UPLOAD_ROOT: root,
    });
    configureRuntime({
      config,
      redis,
      mailer: {
        sendMail: async (message) => {
          outbox.push(message);
          return { messageId: "test" };
        },
      },
      verifyGoogle: async (token) => {
        if (token !== "test-google") throw new Error();
        return {
          sub: "google-test",
          email: "google@example.com",
          email_verified: true,
          given_name: "Google",
          family_name: "User",
        };
      },
    });
    const server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = "http://127.0.0.1:" + server.address().port;
    const request = async (method, url, body, status = 200, token) => {
      const response = await fetch(base + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();
      assert.equal(response.status, status, JSON.stringify(data));
      return data;
    };
    const signup = {
      firstName: "Muhammad",
      lastName: "Magdy",
      email: "student@example.com",
      password: "StrongPass123!",
      confirmPassword: "StrongPass123!",
      phone: "01011111111",
      gender: "male",
      age: 25,
    };
    try {
      const registered = await request(
        "POST",
        "/api/auth/register",
        signup,
        201,
      );
      assert.ok(!registered.data.password);
      const id = registered.data._id;
      const raw = await User.findById(id).select("+password +phoneNumber");
      assert.ok(raw.password.startsWith("$2"));
      assert.ok(await compareTwoHashes(raw.password, signup.password));
      assert.notEqual(raw.phoneNumber, signup.phone);
      await request("POST", "/api/auth/register", signup, 409);
      await request(
        "POST",
        "/api/auth/login",
        { email: signup.email, password: signup.password },
        403,
      );
      const otp = outbox[0].text.match(/\b\d{6}\b/)[0];
      const stored = await redis.get("email_verificaton:" + signup.email);
      assert.ok(stored.startsWith("$2"));
      assert.notEqual(stored, otp);
      await request(
        "PATCH",
        "/api/auth/confirm-email",
        { email: signup.email, otp: "000000" },
        400,
      );
      await request("PATCH", "/api/auth/confirm-email", {
        email: signup.email,
        otp,
      });
      await request(
        "PATCH",
        "/api/auth/confirm-email",
        { email: signup.email, otp },
        400,
      );
      let tokens = await request("POST", "/api/auth/login", {
        email: signup.email,
        password: signup.password,
      });
      const profile = await request(
        "GET",
        "/api/users/profile",
        undefined,
        200,
        tokens.accessToken,
      );
      assert.equal(profile.data.phoneNumber, signup.phone);
      assert.ok(!profile.data.password);
      assert.equal(profile.data.gender, "male");
      assert.ok(profile.data.isEmailVerified);
      await request(
        "GET",
        "/api/users/profile",
        undefined,
        401,
        tokens.refreshToken,
      );
      await request("GET", "/api/users", undefined, 403, tokens.accessToken);
      await request(
        "PATCH",
        "/api/users/profile",
        { role: "admin" },
        400,
        tokens.accessToken,
      );
      await request(
        "PATCH",
        "/api/users/profile",
        { firstName: "Updated" },
        200,
        tokens.accessToken,
      );
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2ioAAAAASUVORK5CYII=",
        "base64",
      );
      const upload = async (
        bytes,
        mime = "image/png",
        field = "profile",
        token = tokens.accessToken,
      ) => {
        const form = new FormData();
        if (bytes)
          form.append(
            field,
            new Blob([bytes], { type: mime }),
            "../../test.png",
          );
        const response = await fetch(base + "/api/users/profile-picture", {
          method: "PATCH",
          headers: token ? { Authorization: "Bearer " + token } : {},
          body: form,
        });
        return { status: response.status, data: await response.json() };
      };
      const uploaded = await upload(png);
      assert.equal(uploaded.status, 200, JSON.stringify(uploaded.data));
      assert.match(
        uploaded.data.data.profileImage,
        /^uploads\/Profiles\/[0-9a-f-]+\.png$/,
      );
      const filename = path.basename(uploaded.data.data.profileImage);
      assert.deepEqual(
        await readFile(path.join(root, "Profiles", filename)),
        png,
      );
      assert.equal(
        (await fetch(base + "/" + uploaded.data.data.profileImage)).status,
        200,
      );
      assert.equal((await upload()).status, 400);
      assert.equal((await upload(png, "image/png", "avatar")).status, 400);
      assert.equal(
        (await upload(Buffer.from("fake"), "image/png")).status,
        400,
      );
      assert.equal((await upload(png, "text/plain")).status, 400);
      assert.equal(
        (await upload(Buffer.alloc(2 * 1024 * 1024 + 1))).status,
        413,
      );
      assert.equal(
        (await upload(png, "image/png", "profile", null)).status,
        401,
      );
      assert.equal((await readdir(path.join(root, "Profiles"))).length, 1);
      const refreshed = await request("POST", "/api/auth/refresh-token", {
        refreshToken: tokens.refreshToken,
      });
      assert.ok(refreshed.accessToken);
      assert.ok(refreshed.refreshToken);
      const second = await request("POST", "/api/auth/google", {
        idToken: "test-google",
      });
      await request(
        "POST",
        "/api/auth/logout",
        { refreshToken: second.refreshToken },
        401,
        tokens.accessToken,
      );
      const message = await request(
        "POST",
        "/api/messages/" + id,
        { content: "Hello" },
        201,
      );
      assert.equal(
        (
          await request(
            "GET",
            "/api/messages",
            undefined,
            200,
            tokens.accessToken,
          )
        ).data.total,
        1,
      );
      await request(
        "DELETE",
        "/api/messages/" + message.data._id,
        undefined,
        404,
        second.accessToken,
      );
      await request(
        "DELETE",
        "/api/messages/" + message.data._id,
        undefined,
        200,
        tokens.accessToken,
      );
      await request(
        "POST",
        "/api/auth/logout",
        { refreshToken: tokens.refreshToken },
        200,
        tokens.accessToken,
      );
      await request(
        "GET",
        "/api/users/profile",
        undefined,
        401,
        tokens.accessToken,
      );
      await request(
        "POST",
        "/api/auth/refresh-token",
        { refreshToken: tokens.refreshToken },
        401,
      );
      const keys = await redis.keys("bl_*");
      assert.equal(keys.length, 2);
      for (const key of keys) assert.ok((await redis.ttl(key)) > 0);
      await request(
        "DELETE",
        "/api/users/delete",
        undefined,
        200,
        refreshed.accessToken,
      );
      await request(
        "GET",
        "/api/users/profile",
        undefined,
        401,
        refreshed.accessToken,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
      const keys = await redis.keys("*");
      if (keys.length) await redis.del(keys);
      await redis.quit();
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      await mongo.stop();
      await rm(root, { recursive: true, force: true });
    }
  },
);
