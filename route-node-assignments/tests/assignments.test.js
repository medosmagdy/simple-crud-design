const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { once } = require("node:events");
const a = require("../assignment-01-javascript");
test("JavaScript answers and bonus edge cases", async () => {
  assert.equal(a.convertAndAdd("123"), 130);
  for (const v of [0, false, "", null, undefined, NaN])
    assert.equal(a.validateTruthy(v), "Invalid");
  const logged = [];
  const original = console.log;
  console.log = (n) => logged.push(n);
  try {
    a.printOddNumbers();
  } finally {
    console.log = original;
  }
  assert.deepEqual(logged, [1, 3, 5, 7, 9]);
  assert.deepEqual(a.evenNumbers([1, 2, 3, 4, 5]), [2, 4]);
  assert.deepEqual(a.mergeArrays([1, 2], [3]), [1, 2, 3]);
  assert.equal(a.dayOfWeek(2), "Monday");
  assert.equal(a.dayOfWeek(0), "Invalid day");
  assert.deepEqual(a.stringLengths(["a", "ab", "abc"]), [1, 2, 3]);
  assert.equal(a.divisibleBy3And5(15), "Divisible by both");
  assert.equal(a.square(5), 25);
  assert.equal(
    a.describePerson({ name: "John", age: 25 }),
    "John is 25 years old",
  );
  assert.equal(a.sum(1, 2, 3, 4, 5), 15);
  assert.equal(a.largestNumber([-7, -2, -10]), -2);
  assert.throws(() => a.largestNumber([]));
  assert.deepEqual(a.objectKeys({ name: "John", age: 30 }), ["name", "age"]);
  assert.deepEqual(a.splitWords("The quick brown fox"), [
    "The",
    "quick",
    "brown",
    "fox",
  ]);
  const start = Date.now();
  assert.equal(await a.delayedSuccess(), "Success");
  assert.ok(Date.now() - start >= 2900);
  const c = require("../assignment-01-javascript/bonus")(5);
  assert.equal(c.increment(), 6);
  assert.equal(c.reset(), 5);
  assert.equal(c.decrement(), 4);
  assert.equal(require("../assignment-02-core/bonus")([2, 3, 4, 7, 11], 5), 9);
  assert.equal(require("../assignment-02-core/bonus")([], 3), 3);
  assert.equal(
    require("../assignment-03-express/bonus")(["flower", "flow", "flight"]),
    "fl",
  );
  assert.equal(require("../assignment-03-express/bonus")([]), "");
  const nums = [3, 2, 2, 3];
  assert.equal(require("../assignment-05-sequelize/bonus")(nums, 3), 2);
  assert.deepEqual(nums.slice(0, 2), [2, 2]);
  assert.equal(require("../assignment-06-mongodb/bonus")("MCMXCIV"), 1994);
});
test("Core modules: path, filesystem, events and real gzip pipeline", async () => {
  const a = require("../assignment-02-core/core-modules");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "route-core-"));
  try {
    assert.equal(a.fileName("/user/files/report.pdf"), "report.pdf");
    assert.equal(
      a.buildPath({ dir: "/folder", name: "app", ext: ".js" }),
      "/folder/app.js",
    );
    assert.equal(a.extension("/docs/readme.md"), ".md");
    assert.deepEqual(a.nameAndExtension("/home/app/main.js"), {
      Name: "main",
      Ext: ".js",
    });
    assert.ok(a.isAbsolute("/home/a"));
    assert.equal(
      a.joinSegments("src", "components", "App.js"),
      "src/components/App.js",
    );
    assert.equal(a.resolvePath("./index.js"), path.resolve("./index.js"));
    assert.equal(
      a.joinTwoPaths("/folder1", "folder2/file.txt"),
      "/folder1/folder2/file.txt",
    );
    a.createFolder(path.join(dir, "folder"));
    assert.ok(await a.directoryExists(path.join(dir, "folder")));
    const source = path.join(dir, "source.txt");
    await a.writeFile(source, "This is a note.\n".repeat(150));
    assert.equal(await a.directoryExists(source), false);
    assert.equal(a.exists(source), true);
    const content = await fs.readFile(source, "utf8");
    assert.equal(a.readFile(source), content);
    await a.readChunks(source);
    await a.copyFile(source, path.join(dir, "dest.txt"));
    assert.equal(
      await fs.readFile(path.join(dir, "dest.txt"), "utf8"),
      content,
    );
    await a.compressFile(source, path.join(dir, "data.gz"));
    assert.equal(
      zlib.gunzipSync(await fs.readFile(path.join(dir, "data.gz"))).toString(),
      content,
    );
    await a.deleteFile(source);
    assert.equal(a.exists(source), false);
    assert.equal(await a.directoryExists(path.join(dir, "missing")), false);
    assert.deepEqual(a.systemInfo(), {
      Platform: os.platform(),
      Arch: os.arch(),
    });
    assert.ok(a.currentLocation().File.endsWith("core-modules.js"));
    const start = once(a.events, "start");
    a.events.emit("start");
    await start;
    const login = once(a.events, "login");
    a.login("Ahmed");
    assert.deepEqual(await login, ["Ahmed"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
for (const mode of ["core", "express"])
  test(
    mode + " API: persistence, validation, concurrent writes, CRUD",
    async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "route-users-"));
      const file = path.join(dir, "users.json");
      let server;
      try {
        server =
          mode === "core"
            ? require("../assignment-02-core/server").createServer(file)
            : require("../assignment-03-express/app").createApp(file).listen();
        if (mode === "core") server.listen(0, "127.0.0.1");
        await once(server, "listening");
        let base = "http://127.0.0.1:" + server.address().port;
        const request = async (method, url, body) => {
          const response = await fetch(base + url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
          });
          return { status: response.status, body: await response.json() };
        };
        assert.deepEqual((await request("GET", "/user")).body, { users: {} });
        assert.equal(
          (await request("POST", "/user", { name: "A", email: "bad", age: 2 }))
            .status,
          400,
        );
        assert.equal(
          (
            await request("POST", "/user", {
              name: "A",
              email: "a@e.com",
              age: "22",
            })
          ).status,
          400,
        );
        const user = await request("POST", "/user", {
          name: "Ahmed",
          email: "AHMED@example.com",
          age: 25,
        });
        assert.equal(user.status, 201);
        const key = user.body.user.id;
        const duplicate = await Promise.all([
          request("POST", "/user", {
            name: "D",
            email: "same@example.com",
            age: 2,
          }),
          request("POST", "/user", {
            name: "D",
            email: "SAME@example.com",
            age: 2,
          }),
        ]);
        assert.deepEqual(duplicate.map((r) => r.status).sort(), [201, 409]);
        assert.equal(
          (await request("PATCH", "/user/" + key, { age: 30 })).body.user.age,
          30,
        );
        assert.equal(
          (
            await request("PATCH", "/user/" + key, {
              email: "same@example.com",
            })
          ).status,
          409,
        );
        assert.equal((await request("PATCH", "/user/" + key, {})).status, 400);
        assert.equal((await request("GET", "/user/missing")).status, 404);
        if (mode === "express") {
          assert.ok(
            (await request("GET", "/user/getByName?name=ahmed")).body.users[
              key
            ],
          );
          assert.ok(
            (await request("GET", "/user/filter?minAge=30")).body.users[key],
          );
          assert.equal(
            Object.keys(
              (await request("GET", "/user/filter?minAge=31")).body.users,
            ).length,
            0,
          );
          assert.equal(
            (await request("GET", "/user/filter?minAge=x")).status,
            400,
          );
        }
        const inserted = await Promise.all(
          Array.from({ length: 12 }, (_, i) =>
            request("POST", "/user", {
              name: "User " + i,
              email: "user" + i + "@example.com",
              age: i,
            }),
          ),
        );
        assert.ok(inserted.every((x) => x.status === 201));
        assert.equal(
          Object.keys(JSON.parse(await fs.readFile(file, "utf8"))).length,
          14,
        );
        // A fresh server/store instance must load the same JSON file.
        await new Promise((resolve) => server.close(resolve));
        server =
          mode === "core"
            ? require("../assignment-02-core/server").createServer(file)
            : require("../assignment-03-express/app").createApp(file).listen();
        if (mode === "core") server.listen(0, "127.0.0.1");
        await once(server, "listening");
        base = "http://127.0.0.1:" + server.address().port;
        assert.equal((await request("GET", "/user/" + key)).body.user.age, 30);
        if (mode === "express")
          assert.equal(
            (await request("DELETE", "/user", { id: key })).status,
            200,
          );
        else
          assert.equal((await request("DELETE", "/user/" + key)).status, 200);
        assert.equal((await request("GET", "/user/" + key)).status, 404);
        assert.equal((await request("DELETE", "/user/" + key)).status, 404);
      } finally {
        if (server?.listening)
          await new Promise((resolve) => server.close(resolve));
        await fs.rm(dir, { recursive: true, force: true });
      }
    },
  );
test("Sequelize models: definitions, validations, hashing and paranoid option (no SQL server)", async () => {
  const {
    Sequelize,
  } = require("../assignment-05-sequelize/node_modules/sequelize");
  const sequelize = new Sequelize("test", "test", "test", {
    dialect: "mysql",
    logging: false,
  });
  try {
    const { User, Post, Comment } =
      require("../assignment-05-sequelize/src/models").defineModels(sequelize);
    await assert.rejects(
      User.build({
        name: "Ahmed",
        email: "bad",
        password: "1234567",
      }).validate(),
    );
    await assert.rejects(
      User.build({
        name: "Ahmed",
        email: "a@b.com",
        password: "123456",
      }).validate(),
    );
    await assert.rejects(
      User.runHooks(
        "beforeCreate",
        User.build({ name: "Al", email: "a@b.com", password: "1234567" }),
      ),
    );
    const user = User.build({
      name: "Ahmed",
      email: "a@b.com",
      password: "1234567",
    });
    await user.validate();
    await User.runHooks("beforeSave", user);
    assert.ok(!user.password.includes("1234567"));
    assert.ok(Post.options.paranoid);
    assert.ok(Comment.associations.user);
    assert.ok(Post.associations.comments);
  } finally {
    await sequelize.close();
  }
});
