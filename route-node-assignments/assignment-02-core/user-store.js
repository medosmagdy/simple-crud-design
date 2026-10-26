"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const fail = (status, message) => Object.assign(new Error(message), { status });
class UserStore {
  constructor(file) {
    this.file = file;
    this.queue = Promise.resolve();
  }
  async read() {
    try {
      const data = JSON.parse(await fs.readFile(this.file, "utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error("Expected a JSON object keyed by user ID");
      return data;
    } catch (error) {
      if (error.code === "ENOENT") return {};
      throw error;
    }
  }
  mutate(action) {
    const operation = this.queue.then(async () => {
      const data = await this.read();
      const result = action(data);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temporary = this.file + ".tmp";
      await fs.writeFile(temporary, JSON.stringify(data, null, 2) + "\n");
      await fs.rename(temporary, this.file);
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  validate(body, partial = false) {
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw fail(400, "Expected a JSON object");
    const result = {};
    for (const key of Object.keys(body))
      if (!["name", "email", "age"].includes(key))
        throw fail(400, "Unknown field: " + key);
    for (const key of ["name", "email", "age"]) {
      if (!Object.hasOwn(body, key)) {
        if (!partial) throw fail(400, key + " is required");
        continue;
      }
      let value = body[key];
      if (key === "age") {
        if (!Number.isInteger(value) || value < 0 || value > 150)
          throw fail(400, "age must be an integer from 0 to 150");
      } else {
        if (typeof value !== "string" || !value.trim())
          throw fail(400, key + " must be a nonempty string");
        value = value.trim();
        if (key === "email") {
          value = value.toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            throw fail(400, "Invalid email");
        }
      }
      result[key] = value;
    }
    if (partial && !Object.keys(result).length)
      throw fail(400, "Provide name, age, or email");
    return result;
  }
  unique(data, email, except) {
    for (const id of Object.keys(data))
      if (id !== except && data[id].email === email)
        throw fail(409, "Email already exists");
  }
  create(body) {
    const fields = this.validate(body);
    return this.mutate((data) => {
      this.unique(data, fields.email);
      const id = randomUUID();
      return (data[id] = { id, ...fields });
    });
  }
  update(id, body) {
    const fields = this.validate(body, true);
    return this.mutate((data) => {
      if (!Object.hasOwn(data, id)) throw fail(404, "User not found");
      if (fields.email) this.unique(data, fields.email, id);
      return (data[id] = { ...data[id], ...fields });
    });
  }
  delete(id) {
    return this.mutate((data) => {
      if (!Object.hasOwn(data, id)) throw fail(404, "User not found");
      const user = data[id];
      delete data[id];
      return user;
    });
  }
  async get(id) {
    await this.queue;
    const data = await this.read();
    if (!Object.hasOwn(data, id)) throw fail(404, "User not found");
    return data[id];
  }
  async all() {
    await this.queue;
    return this.read();
  }
  async filter(predicate) {
    const result = {};
    const data = await this.all();
    for (const id of Object.keys(data))
      if (predicate(data[id])) result[id] = data[id];
    return result;
  }
}
module.exports = { UserStore, fail };
