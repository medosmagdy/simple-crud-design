const { Router } = require("express");
const { fn, col } = require("sequelize");
const { id, pick, required, fail } = require("../utils");
module.exports = ({ User, Post, Comment }) => {
  const router = Router();
  router.post("/posts", async (req, res) => {
    const data = pick(req.body, ["title", "content", "userId"]);
    await required(User, data.userId);
    const post = new Post(data);
    await post.save();
    res.status(201).json(post);
  });
  router.delete("/posts/:postId", async (req, res) => {
    const post = await required(Post, req.params.postId);
    if (post.userId !== id(req.body.userId))
      throw fail(403, "Only owner may delete post");
    await post.destroy();
    res.json({ message: "Post soft-deleted" });
  });
  router.get("/posts/details", async (req, res) =>
    res.json(
      await Post.findAll({
        attributes: ["id", "title"],
        include: [
          { model: User, as: "user", attributes: ["id", "name"] },
          { model: Comment, as: "comments", attributes: ["id", "content"] },
        ],
      }),
    ),
  );
  router.get("/posts/comment-count", async (req, res) =>
    res.json(
      await Post.findAll({
        attributes: [
          "id",
          "title",
          [fn("COUNT", col("comments.id")), "commentCount"],
        ],
        include: [{ model: Comment, as: "comments", attributes: [] }],
        group: ["Post.id", "Post.title"],
      }),
    ),
  );
  return router;
};
