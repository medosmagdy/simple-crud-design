const { Router } = require("express");
const { Int32, ObjectId } = require("mongodb");
const fail = (status, message) => Object.assign(new Error(message), { status });
const integer = (value, key) => {
  if (
    value === undefined ||
    value === "" ||
    !Number.isInteger(Number(value)) ||
    Number(value) < -2147483648 ||
    Number(value) > 2147483647
  )
    throw fail(400, "Invalid " + key);
  return Number(value);
};
const book = (body) => {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.title !== "string" ||
    !body.title.trim()
  )
    throw fail(400, "Nonempty title required");
  const result = { title: body.title };
  if (body.author !== undefined) {
    if (typeof body.author !== "string")
      throw fail(400, "author must be a string");
    result.author = body.author;
  }
  if (body.year !== undefined)
    result.year = new Int32(integer(body.year, "year"));
  if (body.genres !== undefined) {
    if (
      !Array.isArray(body.genres) ||
      body.genres.some((x) => typeof x !== "string")
    )
      throw fail(400, "genres must be strings");
    result.genres = body.genres;
  }
  return result;
};
module.exports = (db) => {
  const router = Router();
  const books = db.collection("books");
  router.post("/collection/books", async (req, res) => {
    await db.createCollection("books", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title"],
          properties: {
            title: { bsonType: "string", minLength: 1, pattern: "\\S" },
          },
        },
      },
    });
    res.status(201).json({ message: "Validated books collection created" });
  });
  router.post("/collection/authors", async (req, res) => {
    if (typeof req.body.name !== "string" || !req.body.name.trim())
      throw fail(400, "name required");
    res
      .status(201)
      .json(await db.collection("authors").insertOne({ name: req.body.name }));
  });
  router.post("/collection/logs/capped", async (req, res) => {
    await db.createCollection("logs", { capped: true, size: 1024 * 1024 });
    res.status(201).json({ message: "1MB capped logs created" });
  });
  router.post("/collection/books/index", async (req, res) =>
    res.status(201).json({ index: await books.createIndex({ title: 1 }) }),
  );
  router.post("/books", async (req, res) =>
    res.status(201).json(await books.insertOne(book(req.body))),
  );
  router.post("/books/batch", async (req, res) => {
    const input = Array.isArray(req.body) ? req.body : req.body.books;
    if (!Array.isArray(input) || input.length < 3)
      throw fail(400, "At least three books required");
    res.status(201).json(await books.insertMany(input.map(book)));
  });
  router.post("/logs", async (req, res) => {
    if (typeof req.body.message !== "string" || !req.body.message.trim())
      throw fail(400, "message required");
    const value = { message: req.body.message, createdAt: new Date() };
    if (req.body.bookId !== undefined) {
      if (!ObjectId.isValid(req.body.bookId)) throw fail(400, "Invalid bookId");
      value.bookId = new ObjectId(req.body.bookId);
    }
    res.status(201).json(await db.collection("logs").insertOne(value));
  });
  router.patch("/books/Future", async (req, res) => {
    const r = await books.updateOne(
      { title: "Future" },
      { $set: { year: new Int32(2022) } },
    );
    if (!r.matchedCount) throw fail(404, "Future not found");
    res.json(r);
  });
  router.get("/books/title", async (req, res) => {
    if (typeof req.query.title !== "string" || !req.query.title)
      throw fail(400, "title required");
    const value = await books.findOne({ title: req.query.title });
    if (!value) throw fail(404, "Book not found");
    res.json(value);
  });
  router.get("/books/year", async (req, res) => {
    const from = integer(req.query.from, "from"),
      to = integer(req.query.to, "to");
    if (from > to) throw fail(400, "from must be <= to");
    res.json(await books.find({ year: { $gte: from, $lte: to } }).toArray());
  });
  router.get("/books/genre", async (req, res) => {
    if (typeof req.query.genre !== "string" || !req.query.genre)
      throw fail(400, "genre required");
    res.json(await books.find({ genres: req.query.genre }).toArray());
  });
  router.get("/books/skip-limit", async (req, res) =>
    res.json(
      await books.find().sort({ year: -1, _id: 1 }).skip(2).limit(3).toArray(),
    ),
  );
  router.get("/books/year-integer", async (req, res) =>
    res.json(await books.find({ year: { $type: "int" } }).toArray()),
  );
  router.get("/books/exclude-genres", async (req, res) =>
    res.json(
      await books
        .find({ genres: { $nin: ["Horror", "Science Fiction"] } })
        .toArray(),
    ),
  );
  router.delete("/books/before-year", async (req, res) =>
    res.json(
      await books.deleteMany({
        year: { $lt: integer(req.query.year, "year") },
      }),
    ),
  );
  const aggregates = {
    aggregate1: [
      { $match: { year: { $gt: 2000 } } },
      { $sort: { year: -1, _id: 1 } },
    ],
    aggregate2: [
      { $match: { year: { $gt: 2000 } } },
      { $project: { _id: 0, title: 1, author: 1, year: 1 } },
    ],
    aggregate3: [{ $unwind: "$genres" }],
    aggregate4: [
      {
        $lookup: {
          from: "logs",
          localField: "_id",
          foreignField: "bookId",
          as: "logs",
        },
      },
    ],
  };
  for (const [name, pipeline] of Object.entries(aggregates))
    router.get("/books/" + name, async (req, res) =>
      res.json(await books.aggregate(pipeline).toArray()),
    );
  return router;
};
