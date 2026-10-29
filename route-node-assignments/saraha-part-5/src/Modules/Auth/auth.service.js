import { randomInt } from "node:crypto";
import UserRepository from "../../DB/Repositories/user.repository.js";
import {
  hash,
  compareTwoHashes,
} from "../../Common/Utils/Security/hash.security.js";
import { encrypt } from "../../Common/Utils/Security/encryption.security.js";
import { buildTokens } from "../../Common/Utils/Security/token.utils.js";
import {
  set,
  get,
  del,
  calculateTTL,
  registerOTPAttempt,
} from "../../Common/Utils/Services/redis.service.js";
import { sendEmail } from "../../Common/Utils/Services/email.service.js";
import {
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from "../../Common/Utils/Errors/exceptions.error.js";
import { getDependencies } from "../../Config/env.config.js";
import HttpAppError from "../../Common/Utils/Errors/app.error.js";
const userRepo = new UserRepository();
export function publicUser(user) {
  const data = user.toJSON();
  delete data.password;
  delete data.phoneNumber;
  return data;
}
async function sendVerification(user) {
  const otp = String(randomInt(100000, 1000000));
  const key = `email_verificaton:${user.email}`;
  await set({ key, value: await hash(otp), options: { EX: 600 } });
  await del(key + ":attempts");
  await sendEmail({
    to: user.email,
    subject: "Confirm your Saraha email",
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
  });
}
export async function register(body) {
  const { firstName, lastName, email, password, gender, age, phone } = body;
  if (await userRepo.findUserByEmail(email))
    throw new ConflictException("Email already exists");
  if (!getDependencies().mailer)
    throw new HttpAppError("SMTP is not configured", 503);
  const user = await userRepo.createDocument({
    firstName,
    lastName,
    email,
    password: await hash(password),
    gender,
    age,
    phoneNumber: phone ? encrypt(phone) : undefined,
  });
  await sendVerification(user);
  return publicUser(user);
}
export async function login({ email, password }) {
  const user = await userRepo.findUserByEmail(email, "+password");
  if (
    !user ||
    user.provider !== "local" ||
    !user.password ||
    !(await compareTwoHashes(user.password, password))
  )
    throw new UnauthorizedException("Invalid email or password");
  if (!user.isEmailVerified)
    throw new HttpAppError("Confirm your email first", 403);
  return buildTokens(user);
}
export async function resendConfirmation({ email }) {
  const user = await userRepo.findUserByEmail(email);
  if (user && !user.isEmailVerified) await sendVerification(user);
  return {};
}
export async function confirmEmail({ email, otp }) {
  const key = `email_verificaton:${email}`;
  const hashed = await get(key);
  if (!hashed || !(await registerOTPAttempt(key)))
    throw new BadRequestException("Invalid or expired verification code");
  if (!(await compareTwoHashes(hashed, otp)))
    throw new BadRequestException("Invalid or expired verification code");
  const user = await userRepo.updateOneDocument(
    { email },
    { $set: { isEmailVerified: true } },
  );
  if (!user) throw new BadRequestException("User no longer exists");
  await del(key);
  await del(key + ":attempts");
  return {};
}
export function refreshToken(user) {
  return buildTokens(user);
}
export async function logout(accessTokenData, refreshTokenData) {
  if (accessTokenData._id !== refreshTokenData._id)
    throw new UnauthorizedException("Tokens must belong to the same user");
  await Promise.all([
    set({
      key: `bl_access_${accessTokenData.jti}`,
      value: true,
      options: { EX: calculateTTL(accessTokenData.exp) },
    }),
    set({
      key: `bl_refresh_${refreshTokenData.jti}`,
      value: true,
      options: { EX: calculateTTL(refreshTokenData.exp) },
    }),
  ]);
  return {};
}
export async function googleLogin({ idToken }) {
  const verify = getDependencies().verifyGoogle;
  if (!verify) throw new HttpAppError("Google sign-in is not configured", 503);
  let info;
  try {
    info = await verify(idToken);
  } catch {
    throw new UnauthorizedException("Invalid Google ID token");
  }
  if (!info?.sub || !info.email_verified || !info.email)
    throw new UnauthorizedException("Verified Google email required");
  let user = await userRepo.findOneDocument({ googleId: info.sub });
  if (!user) {
    if (await userRepo.findUserByEmail(info.email.toLowerCase()))
      throw new ConflictException(
        "Use the original sign-in method for this email",
      );
    user = await userRepo.createDocument({
      firstName: info.given_name || "Google",
      lastName: info.family_name || "User",
      email: info.email.toLowerCase(),
      googleId: info.sub,
      provider: "google",
      isEmailVerified: true,
    });
  }
  return buildTokens(user);
}
