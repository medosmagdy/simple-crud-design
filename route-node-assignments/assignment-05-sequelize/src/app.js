const express = require("express");
function createApp(models) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      (!req.body || typeof req.body !== "object")
    )
      return res.status(400).json({ message: "JSON body required" });
    next();
  });
  for (const name of ["users", "posts", "comments"])
    app.use(require("./modules/" + name)(models));
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((e, req, res, next) => {
    const status =
      e.status ||
      (e.name === "SequelizeUniqueConstraintError"
        ? 409
        : e.name === "SequelizeForeignKeyConstraintError"
          ? 409
          : e.name === "SequelizeValidationError" ||
              e.message.startsWith("Name must")
            ? 400
            : 500);
    res
      .status(status)
      .json({ message: status === 500 ? "Internal server error" : e.message });
  });
  return app;
}
module.exports = { createApp };
