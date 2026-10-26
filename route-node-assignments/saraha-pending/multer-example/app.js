const express = require("express");
const multer = require("multer");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
function createApp(directory = path.join(__dirname, "uploads")) {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 4, parts: 5 },
    fileFilter(req, file, cb) {
      if (file.mimetype !== "image/png")
        return cb(
          Object.assign(new Error("Only PNG accepted"), { status: 400 }),
        );
      cb(null, true);
    },
  });
  // Local teaching endpoint. Real apps must authenticate before upload.single.
  app.post("/upload", upload.single("avatar"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "avatar required" });
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (
      req.file.buffer.length < 8 ||
      !req.file.buffer.subarray(0, 8).equals(signature)
    )
      return res.status(400).json({ message: "Invalid PNG signature" });
    await fs.mkdir(directory, { recursive: true });
    const filename = randomUUID() + ".png";
    const target = path.join(directory, filename);
    try {
      await fs.writeFile(target, req.file.buffer, { flag: "wx" });
      res.status(201).json({ filename, size: req.file.size });
    } catch (e) {
      await fs.unlink(target).catch(() => {});
      throw e;
    }
  });
  app.use((e, req, res, next) =>
    res
      .status(
        e instanceof multer.MulterError
          ? e.code === "LIMIT_FILE_SIZE"
            ? 413
            : 400
          : e.status || 500,
      )
      .json({
        message:
          e instanceof multer.MulterError || e.status
            ? e.message
            : "Upload failed",
      }),
  );
  return app;
}
module.exports = { createApp };
if (require.main === module)
  createApp().listen(3007, "127.0.0.1", () =>
    console.log("Local Multer example on port 3007"),
  );
