const { initialize, pool } = require("./db");
initialize()
  .then(() => console.log("Database initialized"))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
