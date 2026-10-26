const { DataTypes, Model } = require("sequelize");
const { scryptSync, randomBytes } = require("node:crypto");
function hashPassword(user) {
  if (user.changed("password")) {
    const salt = randomBytes(16).toString("hex");
    user.password =
      salt + ":" + scryptSync(user.password, salt, 64).toString("hex");
  }
}
function defineModels(sequelize) {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          checkPasswordLength(value) {
            if (typeof value !== "string" || value.length <= 6)
              throw new Error("Password must be longer than 6 characters");
          },
        },
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        defaultValue: "user",
        allowNull: false,
      },
    },
    { hooks: { beforeSave: hashPassword } },
  );
  User.addHook("beforeCreate", "checkNameLength", (user) => {
    if (typeof user.name !== "string" || user.name.trim().length <= 2)
      throw new Error("Name must be longer than 2 characters");
  });
  class Post extends Model {}
  Post.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: "Post", paranoid: true },
  );
  class Comment extends Model {}
  Comment.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      content: { type: DataTypes.TEXT, allowNull: false },
      postId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: "Comment" },
  );
  User.hasMany(Post, { foreignKey: "userId", as: "posts" });
  Post.belongsTo(User, { foreignKey: "userId", as: "user" });
  Post.hasMany(Comment, { foreignKey: "postId", as: "comments" });
  Comment.belongsTo(Post, { foreignKey: "postId", as: "post" });
  User.hasMany(Comment, { foreignKey: "userId", as: "comments" });
  Comment.belongsTo(User, { foreignKey: "userId", as: "user" });
  return { User, Post, Comment };
}
module.exports = { defineModels };
