const express = require("express");
const fail = (status, message) => Object.assign(new Error(message), { status });
const id = (value) => {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw fail(400, "Expected a positive integer");
  return Number(value);
};
const text = (value, key) => {
  if (typeof value !== "string" || !value.trim() || value.length > 255)
    throw fail(400, key + " is required (max 255 characters)");
  return value.trim();
};
function createApp(pool) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      (!req.body || typeof req.body !== "object")
    )
      return res.status(400).json({ message: "JSON body required" });
    next();
  });
  const one = async (table, key, value) => {
    const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${key}=?`, [
      id(value),
    ]);
    if (!rows.length) throw fail(404, "Not found");
    return rows[0];
  };
  const product = (b) => {
    const name = text(b.ProductName, "ProductName");
    if (
      typeof b.Price !== "number" ||
      !Number.isFinite(b.Price) ||
      b.Price < 0 ||
      b.Price > 99999999.99 ||
      Math.abs(b.Price * 100 - Math.round(b.Price * 100)) > 0.00001
    )
      throw fail(400, "Invalid Price (at most two decimals)");
    if (!Number.isInteger(b.StockQuantity) || b.StockQuantity < 0)
      throw fail(400, "Invalid StockQuantity");
    return [name, b.Price, b.StockQuantity, id(b.SupplierID)];
  };
  const supplier = (b) => {
    const name = text(b.SupplierName, "SupplierName");
    const phone = text(b.ContactNumber, "ContactNumber");
    if (phone.length > 15) throw fail(400, "ContactNumber max length is 15");
    return [name, phone];
  };
  app.post("/products", async (req, res) => {
    const [r] = await pool.execute(
      "INSERT INTO Products(ProductName,Price,StockQuantity,SupplierID) VALUES (?,?,?,?)",
      product(req.body),
    );
    res.status(201).json(await one("Products", "ProductID", r.insertId));
  });
  app.get("/products", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM Products");
    res.json(rows);
  });
  app.patch("/products/bread/price", async (req, res) => {
    const [r] = await pool.execute(
      "UPDATE Products SET Price=? WHERE ProductName=?",
      [25, "Bread"],
    );
    if (!r.affectedRows) throw fail(404, "Bread not found");
    res.json({ message: "Bread price updated to 25.00" });
  });
  app.delete("/products/eggs", async (req, res) => {
    const [r] = await pool.execute("DELETE FROM Products WHERE ProductName=?", [
      "Eggs",
    ]);
    if (!r.affectedRows) throw fail(404, "Eggs not found");
    res.json({ message: "Eggs deleted" });
  });
  app.get("/products/:id", async (req, res) =>
    res.json(await one("Products", "ProductID", req.params.id)),
  );
  app.put("/products/:id", async (req, res) => {
    const values = product(req.body);
    await one("Products", "ProductID", req.params.id);
    await pool.execute(
      "UPDATE Products SET ProductName=?,Price=?,StockQuantity=?,SupplierID=? WHERE ProductID=?",
      [...values, id(req.params.id)],
    );
    res.json(await one("Products", "ProductID", req.params.id));
  });
  app.delete("/products/:id", async (req, res) => {
    const [r] = await pool.execute("DELETE FROM Products WHERE ProductID=?", [
      id(req.params.id),
    ]);
    if (!r.affectedRows) throw fail(404, "Not found");
    res.json({ message: "Product deleted" });
  });
  app.post("/suppliers", async (req, res) => {
    const [r] = await pool.execute(
      "INSERT INTO Suppliers(SupplierName,ContactNumber) VALUES (?,?)",
      supplier(req.body),
    );
    res.status(201).json(await one("Suppliers", "SupplierID", r.insertId));
  });
  app.get("/suppliers", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM Suppliers");
    res.json(rows);
  });
  app.put("/suppliers/:id", async (req, res) => {
    const values = supplier(req.body);
    await one("Suppliers", "SupplierID", req.params.id);
    await pool.execute(
      "UPDATE Suppliers SET SupplierName=?,ContactNumber=? WHERE SupplierID=?",
      [...values, id(req.params.id)],
    );
    res.json(await one("Suppliers", "SupplierID", req.params.id));
  });
  app.delete("/suppliers/:id", async (req, res) => {
    const [r] = await pool.execute("DELETE FROM Suppliers WHERE SupplierID=?", [
      id(req.params.id),
    ]);
    if (!r.affectedRows) throw fail(404, "Not found");
    res.json({ message: "Supplier deleted" });
  });
  app.post("/sales", async (req, res) => {
    const { ProductID, QuantitySold, SaleDate } = req.body;
    id(ProductID);
    id(QuantitySold);
    if (
      typeof SaleDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(SaleDate) ||
      !Number.isFinite(Date.parse(SaleDate)) ||
      new Date(SaleDate).toISOString().slice(0, 10) !== SaleDate
    )
      throw fail(400, "Invalid SaleDate");
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();
      const [[p]] = await c.execute(
        "SELECT * FROM Products WHERE ProductID=? FOR UPDATE",
        [ProductID],
      );
      if (!p) throw fail(404, "Product not found");
      if (p.StockQuantity < QuantitySold) throw fail(409, "Insufficient stock");
      const [r] = await c.execute(
        "INSERT INTO Sales(ProductID,QuantitySold,SaleDate) VALUES (?,?,?)",
        [ProductID, QuantitySold, SaleDate],
      );
      await c.execute(
        "UPDATE Products SET StockQuantity=StockQuantity-? WHERE ProductID=?",
        [QuantitySold, ProductID],
      );
      await c.commit();
      res
        .status(201)
        .json({ SaleID: r.insertId, ProductID, QuantitySold, SaleDate });
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  });
  app.get("/sales", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM Sales");
    res.json(rows);
  });
  app.get("/sales/product/:id", async (req, res) => {
    const [rows] = await pool.execute("SELECT * FROM Sales WHERE ProductID=?", [
      id(req.params.id),
    ]);
    res.json(rows);
  });
  const reports = {
    "total-sold":
      "SELECT p.ProductID,p.ProductName,COALESCE(SUM(s.QuantitySold),0) AS TotalSold FROM Products p LEFT JOIN Sales s ON s.ProductID=p.ProductID GROUP BY p.ProductID,p.ProductName",
    "highest-stock":
      "SELECT * FROM Products ORDER BY StockQuantity DESC,ProductID ASC LIMIT 1",
    "suppliers-f": "SELECT * FROM Suppliers WHERE SupplierName LIKE 'F%'",
    unsold:
      "SELECT p.* FROM Products p WHERE NOT EXISTS (SELECT 1 FROM Sales s WHERE s.ProductID=p.ProductID)",
    "sales-details":
      "SELECT p.ProductName,s.QuantitySold,s.SaleDate FROM Sales s JOIN Products p ON p.ProductID=s.ProductID",
  };
  for (const [name, sql] of Object.entries(reports))
    app.get("/reports/" + name, async (req, res) => {
      const [rows] = await pool.query(sql);
      res.json(rows);
    });
  const migrations = {
    "add-category": "ALTER TABLE Products ADD COLUMN Category VARCHAR(100)",
    "remove-category": "ALTER TABLE Products DROP COLUMN Category",
    "contact-number":
      "ALTER TABLE Suppliers MODIFY ContactNumber VARCHAR(15) NOT NULL",
    "product-name-required":
      "ALTER TABLE Products MODIFY ProductName VARCHAR(255) NOT NULL",
  };
  for (const [name, sql] of Object.entries(migrations))
    app.post("/admin/schema/" + name, async (req, res) => {
      if (!process.env.ADMIN_TOKEN)
        throw fail(503, "Configure ADMIN_TOKEN to enable schema exercises");
      if (req.get("authorization") !== "Bearer " + process.env.ADMIN_TOKEN)
        throw fail(403, "Invalid admin token");
      await pool.query(sql);
      res.json({ message: "Schema updated" });
    });
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((e, req, res, next) => {
    const status =
      e.status ||
      ([
        "ER_ROW_IS_REFERENCED_2",
        "ER_NO_REFERENCED_ROW_2",
        "ER_DUP_ENTRY",
      ].includes(e.code)
        ? 409
        : 500);
    res
      .status(status)
      .json({ message: status === 500 ? "Internal server error" : e.message });
  });
  return app;
}
module.exports = { createApp };
