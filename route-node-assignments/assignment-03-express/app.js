"use strict";
const express = require("express");
const path = require("node:path");
const { UserStore, fail } = require("./user-store");
function createApp(
  file = process.env.DATA_FILE || path.join(__dirname, "data/users.json"),
) {
  const app = express();
  const store = new UserStore(file);
  app.use(express.json({ limit: "16kb" }));
  app.post("/user", async (req, res) =>
    res
      .status(201)
      .json({ message: "User added", user: await store.create(req.body) }),
  );
  app.patch("/user/:id", async (req, res) =>
    res.json({
      message: "User updated",
      user: await store.update(req.params.id, req.body),
    }),
  );
  const remove = async (req, res) => {
    const id = req.params.id || req.body?.id;
    if (typeof id !== "string" || !id) throw fail(400, "id is required");
    res.json({ message: "User deleted", user: await store.delete(id) });
  };
  app.delete("/user/:id", remove);
  app.delete("/user", remove);
  app.get("/user/getByName", async (req, res) => {
    if (typeof req.query.name !== "string" || !req.query.name.trim())
      throw fail(400, "name is required");
    res.json({
      users: await store.filter(
        (user) =>
          user.name.toLowerCase() === req.query.name.trim().toLowerCase(),
      ),
    });
  });
  app.get("/user/filter", async (req, res) => {
    const value = req.query.minAge;
    if (
      typeof value !== "string" ||
      !/^\d+$/.test(value) ||
      Number(value) > 150
    )
      throw fail(400, "minAge must be an integer from 0 to 150");
    res.json({
      users: await store.filter((user) => user.age >= Number(value)),
    });
  });
  app.get("/user", async (req, res) => res.json({ users: await store.all() }));
  app.get("/user/:id", async (req, res) =>
    res.json({ user: await store.get(req.params.id) }),
  );
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((error, req, res, next) =>
    res
      .status(error.status || 500)
      .json({
        message: error.status ? error.message : "Internal server error",
      }),
  );
  return app;
}
module.exports = { createApp };
if (require.main === module)
  createApp().listen(process.env.PORT || 3003, () =>
    console.log("Express API listening"),
  );
