const { pool, initialize } = require("./db");
const { createApp } = require("./app");
initialize()
  .then(() =>
    createApp(pool).listen(process.env.PORT || 3004, () =>
      console.log("Store API listening"),
    ),
  )
  .catch((e) => {
    console.error(e.message);
    pool.end();
    process.exitCode = 1;
  });
