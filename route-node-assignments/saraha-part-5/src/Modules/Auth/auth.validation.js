import { z } from "zod";
import { genderEnum } from "../../Common/constants.js";
const email = z.email().transform((value) => value.toLowerCase());
const password = z.string().min(8).max(72);
export const loginSchema = z.strictObject({ email, password });
export const signupSchema = loginSchema
  .extend({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    confirmPassword: z.string(),
    gender: z.enum(Object.values(genderEnum)).default(genderEnum.OTHER),
    phone: z
      .string()
      .regex(/^\+?\d{10,15}$/)
      .optional(),
    age: z.number().int().min(18).max(60).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export const confirmEmailSchema = z.strictObject({
  email,
  otp: z.string().regex(/^\d{6}$/),
});
export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(1),
});
export const emailSchema = z.strictObject({ email });
export const googleSchema = z.strictObject({ idToken: z.string().min(1) });
