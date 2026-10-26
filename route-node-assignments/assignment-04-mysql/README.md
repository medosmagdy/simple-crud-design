# Assignment 4 — MySQL — Muhammad Magdy

Node 22+, MySQL 8+. Copy .env.example to .env and configure credentials. Run npm ci, npm run init, npm run seed, npm start. Base URL: http://localhost:3004.

Part 1: musicana.md (ERD + relational mapping). Part 2: schema-mapping.md and sql/erd-mapping.sql map the supplied User/Product ERD, separately from the retail store.
Part 3: src/db.js initializes the database and tables, src/app.js implements product/supplier CRUD, sales and reports. Seed runs once on a clean database and adds the exact FreshFoods/Milk/Bread/Eggs fixture and historical sale. Fixture stock is current stock; new sales decrement it transactionally with a row lock.

Products: POST/GET /products, GET/PUT/DELETE /products/:id. Product JSON fields: ProductName, Price (number, max two decimals), StockQuantity (nonnegative integer), SupplierID (positive integer).
Suppliers: POST/GET /suppliers, PUT/DELETE /suppliers/:id. Fields: SupplierName, ContactNumber.
Sales: POST/GET /sales, GET /sales/product/:id. Fields: ProductID, QuantitySold, SaleDate (YYYY-MM-DD).
Task 5: POST /admin/schema/add-category, /admin/schema/remove-category, /admin/schema/contact-number, /admin/schema/product-name-required. Configure ADMIN_TOKEN and send Authorization: Bearer <token>. Run once in order. Equivalent SQL: sql/modifications.sql.
Task 7: PATCH /products/bread/price. Task 8: DELETE /products/eggs.
Tasks 9–13: GET /reports/total-sold, /reports/highest-stock, /reports/suppliers-f, /reports/unsold, /reports/sales-details.
Tasks 14–16: sql/permissions.sql. Replace the password and run with a local administrator. The API never grants database privileges.
Referenced suppliers and sold products return 409 on deletion to preserve history.
Import postman_collection.json, run seed first and configure adminToken for schema requests. Returned IDs are captured automatically. This is an export, not hosted Postman documentation. Bonus is prepared in bonus.txt; not submitted to LeetCode.
