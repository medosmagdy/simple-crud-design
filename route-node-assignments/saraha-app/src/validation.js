const { z } = require("zod");
const { AppError } = require("./errors");
const email = z.email().transform((v) => v.trim().toLowerCase());
const password = z.string().min(8).max(128);
const phone = z.string().regex(/^\+?\d{10,15}$/);
const person = {
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: phone.optional(),
  age: z.number().int().min(18).max(100).optional(),
};
const signup = z
  .strictObject({ ...person, email, password, confirmPassword: password })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
const login = z.strictObject({ email, password });
const otp = z.strictObject({ email, otp: z.string().regex(/^\d{6}$/) });
const profile = z
  .strictObject(person)
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one profile field",
  });
const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new AppError(
      400,
      result.error.issues
        .map((i) => i.path.join(".") + ": " + i.message)
        .join("; "),
    );
  return result.data;
};
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
module.exports = {
  z,
  email,
  password,
  signup,
  login,
  otp,
  profile,
  parse,
  objectId,
};
