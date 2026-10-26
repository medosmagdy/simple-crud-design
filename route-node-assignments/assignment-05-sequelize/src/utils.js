const fail = (status, message) => Object.assign(new Error(message), { status });
const id = (value) => {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw fail(400, "Expected positive integer ID");
  return Number(value);
};
const pick = (body, fields) =>
  Object.fromEntries(
    fields.filter((k) => Object.hasOwn(body, k)).map((k) => [k, body[k]]),
  );
const publicUser = (user) => {
  const data = user.toJSON();
  delete data.password;
  return data;
};
async function required(model, value, options) {
  const record = await model.findByPk(id(value), options);
  if (!record) throw fail(404, "Not found");
  return record;
}
module.exports = { fail, id, pick, publicUser, required };
