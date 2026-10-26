const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
test("Multer example: valid upload, missing file, MIME, signature, size and field rejection", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "route-upload-"));
  const server = require("../saraha-pending/multer-example/app")
    .createApp(dir)
    .listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = "http://127.0.0.1:" + server.address().port + "/upload";
  try {
    const post = async (buffer, type = "image/png", key = "avatar") => {
      const form = new FormData();
      if (buffer)
        form.append(key, new Blob([buffer], { type }), "../../test.png");
      const r = await fetch(url, { method: "POST", body: form });
      return { status: r.status, body: await r.json() };
    };
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2ioAAAAASUVORK5CYII=",
      "base64",
    );
    const ok = await post(png);
    assert.equal(ok.status, 201);
    assert.match(ok.body.filename, /^[0-9a-f-]+\.png$/);
    assert.deepEqual(await fs.readFile(path.join(dir, ok.body.filename)), png);
    assert.equal((await post()).status, 400);
    assert.equal((await post(Buffer.from("fake"))).status, 400);
    assert.equal((await post(png, "text/plain")).status, 400);
    assert.equal((await post(png, "image/png", "other")).status, 400);
    assert.equal((await post(Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
    assert.equal((await fs.readdir(dir)).length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
