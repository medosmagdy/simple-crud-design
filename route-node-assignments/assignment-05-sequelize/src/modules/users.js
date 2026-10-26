const { Router } = require("express");
const { fail, id, pick, publicUser, required } = require("../utils");
module.exports = ({ User }) => {
  const router = Router();
  router.post("/users/signup", async (req, res) => {
    const data = pick(req.body, ["name", "email", "password", "role"]);
    if (await User.findOne({ where: { email: data.email || "" } }))
      throw fail(409, "Email already exists");
    const user = User.build(data);
    await user.save();
    res.status(201).json(publicUser(user));
  });
  router.put("/users/:id", async (req, res) => {
    const key = id(req.params.id);
    let user = await User.findByPk(key);
    const data = pick(req.body, ["name", "email", "password", "role"]);
    if (user) {
      user.set(data);
      await user.save({ validate: false });
      res.json(publicUser(user));
    } else {
      user = User.build({ id: key, ...data });
      await user.save({ validate: false });
      res.status(201).json(publicUser(user));
    }
  });
  router.get("/users/by-email", async (req, res) => {
    if (typeof req.query.email !== "string")
      throw fail(400, "email is required");
    const user = await User.findOne({ where: { email: req.query.email } });
    if (!user) throw fail(404, "Not found");
    res.json(publicUser(user));
  });
  router.get("/user/:id", async (req, res) => {
    const user = await required(User, req.params.id, {
      attributes: { exclude: ["role", "password"] },
    });
    res.json(user);
  });
  return router;
};
