import { z } from "zod";
import { genderEnum } from "../../Common/constants.js";
export const profileSchema = z
  .strictObject({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    gender: z.enum(Object.values(genderEnum)),
    age: z.number().int().min(18).max(60),
    phone: z.string().regex(/^\+?\d{10,15}$/),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one profile field",
  });
