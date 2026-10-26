const { Router } = require("express");
const { Op } = require("sequelize");
const { fail, id, pick, required } = require("../utils");
module.exports = ({ User, Post, Comment }) => {
  const router = Router();
  const data = (body) => {
    const result = pick(body, ["content", "postId", "userId"]);
    if (typeof result.content !== "string" || !result.content.trim())
      throw fail(400, "content is required");
    result.userId = id(result.userId);
    result.postId = id(result.postId);
    return result;
  };
  const references = async (value) => {
    await required(User, value.userId);
    await required(Post, value.postId);
  };
  router.post("/comments", async (req, res) => {
    const input = Array.isArray(req.body) ? req.body : req.body.comments;
    if (!Array.isArray(input) || !input.length)
      throw fail(400, "Provide a nonempty comments array");
    const values = input.map(data);
    for (const value of values) await references(value);
    res.status(201).json(await Comment.bulkCreate(values, { validate: true }));
  });
  router.patch("/comments/:commentId", async (req, res) => {
    const comment = await required(Comment, req.params.commentId);
    if (comment.userId !== id(req.body.userId))
      throw fail(403, "Only owner may update comment");
    if (typeof req.body.content !== "string" || !req.body.content.trim())
      throw fail(400, "content is required");
    await comment.update({ content: req.body.content });
    res.json(comment);
  });
  router.post("/comments/find-or-create", async (req, res) => {
    const value = data(req.body);
    await references(value);
    const [comment, created] = await Comment.findOrCreate({ where: value });
    res.status(created ? 201 : 200).json({ created, comment });
  });
  router.get("/comments/search", async (req, res) => {
    if (typeof req.query.word !== "string" || !req.query.word)
      throw fail(400, "word is required");
    res.json(
      await Comment.findAndCountAll({
        where: {
          content: {
            [Op.like]: "%" + req.query.word.replace(/[\\%_]/g, "\\$&") + "%",
          },
        },
      }),
    );
  });
  router.get("/comments/newest/:postId", async (req, res) =>
    res.json(
      await Comment.findAll({
        where: { postId: id(req.params.postId) },
        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
        limit: 3,
      }),
    ),
  );
  router.get("/comments/details/:id", async (req, res) =>
    res.json(
      await required(Comment, req.params.id, {
        include: [
          { model: User, as: "user", attributes: ["id", "name", "email"] },
          { model: Post, as: "post", attributes: ["id", "title", "content"] },
        ],
      }),
    ),
  );
  return router;
};
