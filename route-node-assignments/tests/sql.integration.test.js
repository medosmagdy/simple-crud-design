const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
async function serve(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  return {
    server,
    request: async (method, url, body, status = 200) => {
      const r = await fetch(base + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-admin",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await r.json();
      assert.equal(r.status, status, JSON.stringify(data));
      return data;
    },
  };
}
test(
  "Retail SQL API: CRUD, reports, sales transactions, seed, schema and privilege scripts",
  { skip: !process.env.RUN_SQL_TESTS },
  async () => {
    process.env.DB_NAME = "route_test_store";
    process.env.ADMIN_TOKEN = "test-admin";
    const { pool, initialize } = require("../assignment-04-mysql/src/db");
    let server;
    try {
      await initialize();
      await require("../assignment-04-mysql/src/seed").seed();
      const api = await serve(
        require("../assignment-04-mysql/src/app").createApp(pool),
      );
      server = api.server;
      const req = api.request;
      const products = await req("GET", "/products");
      assert.equal(products.length, 3);
      const milk = products.find((x) => x.ProductName === "Milk");
      assert.equal(milk.Price, 15);
      assert.equal(milk.StockQuantity, 50);
      assert.equal((await req("GET", "/sales")).length, 1);
      const supplier = await req(
        "POST",
        "/suppliers",
        { SupplierName: "Fixture", ContactNumber: "01011111111" },
        201,
      );
      await req("PUT", "/suppliers/" + supplier.SupplierID, {
        SupplierName: "Fixture Updated",
        ContactNumber: "01011111112",
      });
      assert.equal((await req("GET", "/suppliers")).length, 2);
      const p = await req(
        "POST",
        "/products",
        {
          ProductName: "Test",
          Price: 2.5,
          StockQuantity: 3,
          SupplierID: supplier.SupplierID,
        },
        201,
      );
      await req("PUT", "/products/" + p.ProductID, {
        ProductName: "Updated",
        Price: 3.5,
        StockQuantity: 3,
        SupplierID: supplier.SupplierID,
      });
      assert.equal(
        (await req("GET", "/products/" + p.ProductID)).ProductName,
        "Updated",
      );
      await req(
        "POST",
        "/sales",
        { ProductID: p.ProductID, QuantitySold: 2, SaleDate: "2025-05-20" },
        201,
      );
      await req(
        "POST",
        "/sales",
        { ProductID: p.ProductID, QuantitySold: 2, SaleDate: "2025-05-20" },
        409,
      );
      assert.equal(
        (await req("GET", "/products/" + p.ProductID)).StockQuantity,
        1,
      );
      assert.equal(
        (await req("GET", "/sales/product/" + p.ProductID)).length,
        1,
      );
      await req(
        "POST",
        "/sales",
        { ProductID: p.ProductID, QuantitySold: 1, SaleDate: "2025-02-30" },
        400,
      );
      await req("DELETE", "/products/" + p.ProductID, undefined, 409);
      await req("DELETE", "/suppliers/" + supplier.SupplierID, undefined, 409);
      const tempSupplier = await req(
        "POST",
        "/suppliers",
        { SupplierName: "Disposable", ContactNumber: "01011111111" },
        201,
      );
      const temp = await req(
        "POST",
        "/products",
        {
          ProductName: "Disposable",
          Price: 1,
          StockQuantity: 1,
          SupplierID: tempSupplier.SupplierID,
        },
        201,
      );
      await req("DELETE", "/products/" + temp.ProductID);
      await req("DELETE", "/suppliers/" + tempSupplier.SupplierID);
      await req("PATCH", "/products/bread/price", {});
      assert.equal(
        (await req("GET", "/products")).find((x) => x.ProductName === "Bread")
          .Price,
        25,
      );
      await req("DELETE", "/products/eggs");
      assert.ok(
        !(await req("GET", "/products")).some((x) => x.ProductName === "Eggs"),
      );
      assert.equal(
        (await req("GET", "/reports/total-sold")).find(
          (x) => x.ProductID === milk.ProductID,
        ).TotalSold,
        2,
      );
      assert.equal(
        (await req("GET", "/reports/highest-stock"))[0].ProductName,
        "Milk",
      );
      assert.ok(
        (await req("GET", "/reports/suppliers-f")).some(
          (x) => x.SupplierName === "FreshFoods",
        ),
      );
      assert.ok(
        (await req("GET", "/reports/unsold")).some(
          (x) => x.ProductName === "Bread",
        ),
      );
      assert.equal((await req("GET", "/reports/sales-details")).length, 2);
      for (const name of [
        "add-category",
        "remove-category",
        "contact-number",
        "product-name-required",
      ])
        await req("POST", "/admin/schema/" + name, {});
      const [[column]] = await pool.query(
        "SHOW COLUMNS FROM Products LIKE 'ProductName'",
      );
      assert.equal(column.Null, "NO");
      // Administrative statements are tested in an isolated database/user and removed afterwards.
      await pool.query(
        "CREATE USER 'store_manager_test'@'localhost' IDENTIFIED BY 'local-test-only-7x!'",
      );
      await pool.query(
        "GRANT SELECT, INSERT, UPDATE ON route_test_store.* TO 'store_manager_test'@'localhost'",
      );
      await pool.query(
        "REVOKE UPDATE ON route_test_store.* FROM 'store_manager_test'@'localhost'",
      );
      await pool.query(
        "GRANT DELETE ON route_test_store.Sales TO 'store_manager_test'@'localhost'",
      );
      const [grants] = await pool.query(
        "SHOW GRANTS FOR 'store_manager_test'@'localhost'",
      );
      assert.ok(grants.some((g) => Object.values(g)[0].includes("DELETE")));
      await pool.query("DROP USER 'store_manager_test'@'localhost'");
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await pool.query("DROP DATABASE IF EXISTS route_test_store");
      await pool.end();
    }
  },
);
test(
  "Sequelize SQL API: all endpoints, ownership, validation, relationships and soft deletion",
  { skip: !process.env.RUN_SQL_TESTS },
  async () => {
    const mysql = require("../assignment-04-mysql/node_modules/mysql2/promise");
    const config = {
      host: "127.0.0.1",
      port: Number(process.env.DB_PORT),
      user: "root",
    };
    const admin = await mysql.createConnection(config);
    await admin.query("CREATE DATABASE route_test_social");
    const {
      Sequelize,
    } = require("../assignment-05-sequelize/node_modules/sequelize");
    const sequelize = new Sequelize("route_test_social", "root", "", {
      dialect: "mysql",
      ...config,
      logging: false,
    });
    let server;
    try {
      const models =
        require("../assignment-05-sequelize/src/models").defineModels(
          sequelize,
        );
      await sequelize.sync();
      const api = await serve(
        require("../assignment-05-sequelize/src/app").createApp(models),
      );
      server = api.server;
      const req = api.request;
      await req(
        "POST",
        "/users/signup",
        { name: "Ahmed", email: "bad", password: "1234567" },
        400,
      );
      await req(
        "POST",
        "/users/signup",
        { name: "Al", email: "a@b.com", password: "1234567" },
        400,
      );
      await req(
        "POST",
        "/users/signup",
        { name: "Ahmed", email: "a@b.com", password: "123456" },
        400,
      );
      const u = await req(
        "POST",
        "/users/signup",
        { name: "Ahmed", email: "a@b.com", password: "1234567" },
        201,
      );
      assert.ok(!u.password);
      const other = await req(
        "POST",
        "/users/signup",
        { name: "Mona", email: "m@b.com", password: "1234567" },
        201,
      );
      await req(
        "POST",
        "/users/signup",
        { name: "Ahmed", email: "a@b.com", password: "1234567" },
        409,
      );
      await req("PUT", "/users/" + u.id, { name: "Ahmed Updated" });
      await req(
        "PUT",
        "/users/100",
        { name: "Upsert User", email: "u@b.com", password: "1234567" },
        201,
      );
      assert.equal(
        (await req("GET", "/users/by-email?email=a@b.com")).name,
        "Ahmed Updated",
      );
      assert.ok(!Object.hasOwn(await req("GET", "/user/" + u.id), "role"));
      const p = await req(
        "POST",
        "/posts",
        { title: "First", content: "text", userId: u.id },
        201,
      );
      const c = await req(
        "POST",
        "/comments",
        [
          { content: "the first", userId: u.id, postId: p.id },
          { content: "the second", userId: u.id, postId: p.id },
        ],
        201,
      );
      await req(
        "PATCH",
        "/comments/" + c[0].id,
        { content: "the updated", userId: other.id },
        403,
      );
      await req("PATCH", "/comments/" + c[0].id, {
        content: "the updated",
        userId: u.id,
      });
      const input = { content: "unique", userId: u.id, postId: p.id };
      assert.ok(
        (await req("POST", "/comments/find-or-create", input, 201)).created,
      );
      assert.equal(
        (await req("POST", "/comments/find-or-create", input)).created,
        false,
      );
      assert.equal((await req("GET", "/comments/search?word=the")).count, 2);
      assert.equal((await req("GET", "/comments/newest/" + p.id)).length, 3);
      const details = await req("GET", "/comments/details/" + c[0].id);
      assert.equal(details.user.id, u.id);
      assert.equal(details.post.id, p.id);
      const posts = await req("GET", "/posts/details");
      assert.deepEqual(Object.keys(posts[0]).sort(), [
        "comments",
        "id",
        "title",
        "user",
      ]);
      assert.equal(
        Number((await req("GET", "/posts/comment-count"))[0].commentCount),
        3,
      );
      await req("DELETE", "/posts/" + p.id, { userId: other.id }, 403);
      await req("DELETE", "/posts/" + p.id, { userId: u.id });
      assert.equal(await models.Post.findByPk(p.id), null);
      assert.ok(
        (await models.Post.findByPk(p.id, { paranoid: false })).deletedAt,
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await sequelize.close();
      await admin.query("DROP DATABASE route_test_social");
      await admin.end();
    }
  },
);
