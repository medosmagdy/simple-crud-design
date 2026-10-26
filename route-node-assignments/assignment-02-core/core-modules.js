"use strict";
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const { EventEmitter } = require("node:events");
const { pipeline } = require("node:stream/promises");
const { createGzip } = require("node:zlib");
function currentLocation() {
  const location = { File: __filename, Dir: __dirname };
  console.log(location);
  return location;
} // 1
const fileName = (value) => path.basename(value); // 2
const buildPath = (object) => path.format(object); // 3
const extension = (value) => path.extname(value); // 4
function nameAndExtension(value) {
  const parsed = path.parse(value);
  return { Name: parsed.name, Ext: parsed.ext };
} // 5
const isAbsolute = (value) => path.isAbsolute(value); // 6
const joinSegments = (...segments) => path.join(...segments); // 7
const resolvePath = (value) => path.resolve(value); // 8
const joinTwoPaths = (first, second) => path.join(first, second); // 9
async function deleteFile(value) {
  await fsp.unlink(value);
  console.log(`The ${path.basename(value)} is deleted.`);
} // 10
function createFolder(value) {
  fs.mkdirSync(value, { recursive: true });
  console.log("Success");
} // 11
const events = new EventEmitter();
events.on("start", () => console.log("Welcome event triggered!")); // 12: events.emit('start')
events.on("login", (username) => console.log(`User logged in: ${username}`)); // 13
const login = (username) => events.emit("login", username);
function readFile(value) {
  const content = fs.readFileSync(value, "utf8");
  console.log("the file content =>", content);
  return content;
} // 14
const writeFile = (value, content) => fsp.writeFile(value, content, "utf8"); // 15
async function directoryExists(value) {
  // 16: distinguish directories from files
  try {
    return (await fsp.stat(value)).isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
const exists = (value) => fs.existsSync(value); // PDF example uses notes.txt: generic existence alternative.
const systemInfo = () => ({ Platform: os.platform(), Arch: os.arch() }); // 17
async function readChunks(value) {
  for await (const chunk of fs.createReadStream(value, {
    encoding: "utf8",
    highWaterMark: 1024,
  }))
    console.log(chunk);
} // 18
async function copyFile(source, dest) {
  await pipeline(fs.createReadStream(source), fs.createWriteStream(dest));
  console.log("File copied using streams");
} // 19
const compressFile = (source, dest) =>
  pipeline(
    fs.createReadStream(source),
    createGzip(),
    fs.createWriteStream(dest),
  ); // 20
module.exports = {
  currentLocation,
  fileName,
  buildPath,
  extension,
  nameAndExtension,
  isAbsolute,
  joinSegments,
  resolvePath,
  joinTwoPaths,
  deleteFile,
  createFolder,
  events,
  login,
  readFile,
  writeFile,
  directoryExists,
  exists,
  systemInfo,
  readChunks,
  copyFile,
  compressFile,
};
if (require.main === module) {
  currentLocation();
  events.emit("start");
  login("Ahmed");
  console.log(systemInfo());
}
