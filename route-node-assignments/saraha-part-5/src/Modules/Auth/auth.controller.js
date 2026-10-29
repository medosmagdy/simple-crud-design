import { Router } from "express";
import * as authService from "./auth.service.js";
import * as schemas from "./auth.validation.js";
import { validation } from "../../Middleware/validation.middleware.js";
import { authenticate } from "../../Middleware/authentication.middleware.js";
import { decodeRefreshToken } from "../../Middleware/decodeRefreshToken.middleware.js";
const authController = Router();
authController.post(
  "/register",
  validation(schemas.signupSchema),
  async (req, res) => {
    const result = await authService.register(req.validate);
    res
      .status(201)
      .json({ message: "User registered; check your email", data: result });
  },
);
authController.post(
  "/login",
  validation(schemas.loginSchema),
  async (req, res) => {
    const result = await authService.login(req.validate);
    res.status(200).json({ message: "Login successful", ...result });
  },
);
authController.patch(
  "/confirm-email",
  validation(schemas.confirmEmailSchema),
  async (req, res) => {
    const result = await authService.confirmEmail(req.validate);
    res.status(200).json({ message: "Email confirmed", data: result });
  },
);
authController.post(
  "/resend-confirmation",
  validation(schemas.emailSchema),
  async (req, res) => {
    const result = await authService.resendConfirmation(req.validate);
    res.json({
      message: "If eligible, a confirmation email has been sent",
      data: result,
    });
  },
);
authController.post(
  "/refresh-token",
  validation(schemas.refreshSchema),
  decodeRefreshToken,
  async (req, res) => {
    const result = authService.refreshToken(req.refreshUser);
    res.json({ message: "Tokens refreshed", ...result });
  },
);
authController.post(
  "/logout",
  validation(schemas.refreshSchema),
  authenticate,
  decodeRefreshToken,
  async (req, res) => {
    const result = await authService.logout(
      req.accessTokenData,
      req.refreshTokenData,
    );
    res.json({ message: "Logged out", data: result });
  },
);
authController.post(
  "/google",
  validation(schemas.googleSchema),
  async (req, res) =>
    res.json({
      message: "Google login successful",
      ...(await authService.googleLogin(req.validate)),
    }),
);
export default authController;
