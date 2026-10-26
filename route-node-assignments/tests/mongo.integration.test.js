const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const {
  MongoClient,
  Int32,
} = require("../assignment-06-mongodb/node_modules/mongodb");
test(
  "MongoDB: all 19 tasks against a real disposable MongoDB database",
  { skip: !process.env.MONGO_URI && !process.env.RUN_MEMORY_MONGO },
  async () => {
    const memory = process.env.RUN_MEMORY_MONGO
      ? await require("../assignment-06-mongodb/node_modules/mongodb-memory-server").MongoMemoryServer.create(
          { instance: { args: ["--nounixsocket"] } },
        )
      : null;
    const client = new MongoClient(
      memory ? memory.getUri() : process.env.MONGO_URI,
    );
    await client.connect();
    const db = client.db("route_test_" + Date.now());
    let server;
    try {
      server = require("../assignment-06-mongodb/src/app")
        .createApp(db)
        .listen(0, "127.0.0.1");
      await once(server, "listening");
      const base = "http://127.0.0.1:" + server.address().port;
      const request = async (method, url, body, status = 200) => {
        const r = await fetch(base + url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await r.json();
        assert.equal(r.status, status, JSON.stringify(data));
        return data;
      };
      await request("POST", "/collection/books", {}, 201);
      await assert.rejects(db.collection("books").insertOne({ title: "" }));
      await assert.rejects(db.collection("books").insertOne({ title: "  " }));
      await request(
        "POST",
        "/collection/authors",
        { name: "Aldous Huxley" },
        201,
      );
      await request("POST", "/collection/logs/capped", {}, 201);
      const options = await db.collection("logs").options();
      assert.ok(options.capped);
      assert.equal(options.size, 1048576);
      await request("POST", "/collection/books/index", {}, 201);
      assert.ok(
        (await db.collection("books").indexes()).some((i) => i.key.title === 1),
      );
      const b = await request(
        "POST",
        "/books",
        {
          title: "Brave New World",
          author: "Aldous Huxley",
          year: 1932,
          genres: ["Science Fiction"],
        },
        201,
      );
      await request(
        "POST",
        "/books/batch",
        [
          {
            title: "Future",
            author: "A",
            year: 2001,
            genres: ["Science Fiction"],
          },
          { title: "History", author: "B", year: 1995, genres: ["History"] },
          { title: "Modern Life", author: "C", year: 2005, genres: ["Drama"] },
        ],
        201,
      );
      await request("POST", "/books/batch", [], 400);
      await request("POST", "/books", { title: "" }, 400);
      await request(
        "POST",
        "/logs",
        { bookId: b.insertedId, message: "Book added" },
        201,
      );
      await request("PATCH", "/books/Future", {});
      assert.equal(
        (await request("GET", "/books/title?title=Future")).year,
        2022,
      );
      assert.equal(
        (await request("GET", "/books/title?title=Brave%20New%20World")).title,
        "Brave New World",
      );
      assert.equal(
        (await request("GET", "/books/year?from=1990&to=2010")).length,
        2,
      );
      assert.equal(
        (await request("GET", "/books/genre?genre=Science%20Fiction")).length,
        2,
      );
      assert.equal((await request("GET", "/books/skip-limit")).length, 2);
      assert.equal((await request("GET", "/books/year-integer")).length, 4);
      assert.equal((await request("GET", "/books/exclude-genres")).length, 2);
      const sorted = await request("GET", "/books/aggregate1");
      assert.deepEqual(
        sorted.map((x) => x.year),
        [2022, 2005],
      );
      const projection = await request("GET", "/books/aggregate2");
      assert.deepEqual(Object.keys(projection[0]).sort(), [
        "author",
        "title",
        "year",
      ]);
      assert.equal((await request("GET", "/books/aggregate3")).length, 4);
      const joined = await request("GET", "/books/aggregate4");
      assert.equal(joined.find((x) => x._id === b.insertedId).logs.length, 1);
      assert.equal(
        (await request("DELETE", "/books/before-year?year=2000")).deletedCount,
        2,
      );
      assert.equal(await db.collection("books").countDocuments(), 2);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await db.dropDatabase();
      await client.close();
      if (memory) await memory.stop();
    }
  },
);
