import { BadRequestException } from "../Common/Utils/Errors/exceptions.error.js";
export const validation = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    throw new BadRequestException("Validation Error", result.error.issues);
  req.validate = result.data;
  next();
};
