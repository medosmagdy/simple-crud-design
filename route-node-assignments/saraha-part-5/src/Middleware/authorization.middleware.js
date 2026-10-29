import HttpAppError from "../Common/Utils/Errors/app.error.js";
export const authorization =
  (...roles) =>
  (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role))
      throw new HttpAppError("Forbidden", 403);
    next();
  };
