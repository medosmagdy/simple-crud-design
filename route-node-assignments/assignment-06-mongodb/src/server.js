const { MongoClient } = require("mongodb");
const { createApp } = require("./app");
const client = new MongoClient(
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017",
);
client
  .connect()
  .then(() =>
    createApp(client.db(process.env.DB_NAME || "route_books")).listen(
      process.env.PORT || 3006,
      () => console.log("MongoDB API listening"),
    ),
  )
  .catch((e) => {
    console.error(e.message);
    client.close();
    process.exitCode = 1;
  });
