const { Sequelize } = require("sequelize");
const { defineModels } = require("./models");
const { createApp } = require("./app");
const sequelize = new Sequelize(
  process.env.DB_NAME || "route_social",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    dialect: "mysql",
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    logging: false,
  },
);
const models = defineModels(sequelize);
sequelize
  .sync()
  .then(() =>
    createApp(models).listen(process.env.PORT || 3005, () =>
      console.log("Sequelize API listening"),
    ),
  )
  .catch((e) => {
    console.error(e.message);
    sequelize.close();
    process.exitCode = 1;
  });
