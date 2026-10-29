import { z } from "zod";
export const messageSchema = z.strictObject({
  content: z.string().trim().min(1).max(1000),
});
