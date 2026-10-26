"use strict";
const http = require("node:http");
const path = require("node:path");
const { UserStore, fail } = require("./user-store");
async function readBody(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 16384) throw fail(413, "Body too large");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw fail(400, "Invalid JSON");
  }
}
function createServer(
  file = process.env.DATA_FILE || path.join(__dirname, "data/users.json"),
) {
  const store = new UserStore(file);
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      const match = /^\/user(?:\/([^/]+))?\/?$/.exec(url.pathname);
      if (!match) throw fail(404, "Route not found");
      const id = match[1];
      if (req.method === "POST" && !id)
        return send(201, {
          message: "User added",
          user: await store.create(await readBody(req)),
        });
      if (req.method === "GET")
        return send(
          200,
          id ? { user: await store.get(id) } : { users: await store.all() },
        );
      if (req.method === "PATCH" && id)
        return send(200, {
          message: "User updated",
          user: await store.update(id, await readBody(req)),
        });
      if (req.method === "DELETE" && id)
        return send(200, {
          message: "User deleted",
          user: await store.delete(id),
        });
      throw fail(405, "Method not allowed");
    } catch (error) {
      send(error.status || 500, {
        message: error.status ? error.message : "Internal server error",
      });
    }
  });
}
module.exports = { createServer };
if (require.main === module)
  createServer().listen(process.env.PORT || 3002, () =>
    console.log("Core HTTP API listening"),
  );
