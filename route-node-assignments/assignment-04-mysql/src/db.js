const mysql = require("mysql2/promise");
const database = process.env.DB_NAME || "route_store";
if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error("Invalid DB_NAME");
const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};
const pool = mysql.createPool({
  ...config,
  database,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
});
async function initialize() {
  const connection = await mysql.createConnection(config);
  try {
    await connection.query("CREATE DATABASE IF NOT EXISTS `" + database + "`");
  } finally {
    await connection.end();
  }
  await pool.query(
    `CREATE TABLE IF NOT EXISTS Suppliers (SupplierID INT PRIMARY KEY AUTO_INCREMENT,SupplierName VARCHAR(255) NOT NULL,ContactNumber VARCHAR(30) NOT NULL)`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS Products (ProductID INT PRIMARY KEY AUTO_INCREMENT,ProductName VARCHAR(255),Price DECIMAL(10,2) NOT NULL CHECK(Price>=0),StockQuantity INT NOT NULL CHECK(StockQuantity>=0),SupplierID INT NOT NULL,FOREIGN KEY(SupplierID) REFERENCES Suppliers(SupplierID))`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS Sales (SaleID INT PRIMARY KEY AUTO_INCREMENT,ProductID INT NOT NULL,QuantitySold INT NOT NULL CHECK(QuantitySold>0),SaleDate DATE NOT NULL,FOREIGN KEY(ProductID) REFERENCES Products(ProductID))`,
  );
}
module.exports = { pool, initialize };
