import express from "express";
import path from "node:path";
import { configureRuntime, getConfig } from "./Config/env.config.js";
import authController from "./Modules/Auth/auth.controller.js";
import userController from "./Modules/User/user.controller.js";
import messageController from "./Modules/Message/message.controller.js";
import { globalErrorHandler } from "./Middleware/global-error-handler.middleware.js";
export function createApp(runtime) {
  if (runtime) configureRuntime(runtime);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authController);
  app.use("/api/users", userController);
  app.use("/api/messages", messageController);
  app.use(
    "/uploads",
    express.static(getConfig().uploadRoot || path.resolve("uploads"), {
      index: false,
      dotfiles: "deny",
    }),
  );
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use(globalErrorHandler);
  return app;
}
