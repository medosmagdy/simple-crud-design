const express = require("express");
function createApp(db) {
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
  app.use(require("./modules/books")(db));
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((e, req, res, next) => {
    const status =
      e.status ||
      (e.code === 48 || e.code === 11000 ? 409 : e.code === 121 ? 400 : 500);
    res
      .status(status)
      .json({ message: status === 500 ? "Internal server error" : e.message });
  });
  return app;
}
module.exports = { createApp };
