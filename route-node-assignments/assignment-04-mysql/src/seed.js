const { pool, initialize } = require("./db");
async function seed() {
  await initialize();
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [[existing]] = await c.execute(
      "SELECT SupplierID FROM Suppliers WHERE SupplierName=? LIMIT 1",
      ["FreshFoods"],
    );
    if (existing)
      throw new Error(
        "FreshFoods already exists; seed is intended for a clean database",
      );
    const [supplier] = await c.execute(
      "INSERT INTO Suppliers(SupplierName,ContactNumber) VALUES (?,?)",
      ["FreshFoods", "01001234567"],
    );
    let milk;
    for (const [name, price, stock] of [
      ["Milk", 15, 50],
      ["Bread", 10, 30],
      ["Eggs", 20, 40],
    ]) {
      const [r] = await c.execute(
        "INSERT INTO Products(ProductName,Price,StockQuantity,SupplierID) VALUES (?,?,?,?)",
        [name, price, stock, supplier.insertId],
      );
      if (name === "Milk") milk = r.insertId;
    }
    await c.execute(
      "INSERT INTO Sales(ProductID,QuantitySold,SaleDate) VALUES (?,?,?)",
      [milk, 2, "2025-05-20"],
    );
    // Stock describes the CURRENT stock in the supplied fixture (50). New API sales decrement it.
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
module.exports = { seed };
if (require.main === module)
  seed()
    .then(() => console.log("Seed complete"))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
