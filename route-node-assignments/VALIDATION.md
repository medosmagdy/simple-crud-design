# Validation record — 2026-10-26

Executed with Node.js 24.22.1:

- JavaScript: supplied examples, falsy values, negative maximum, delay, bonus algorithms.
- Core modules: path helpers, real filesystem writes/deletes, events, stream copy, gzip round-trip.
- Core HTTP and Express: real HTTP requests, JSON-file persistence across server instances, invalid inputs, duplicate email, concurrent writes, CRUD, Express filters/search and body/parameter deletion.
- Sequelize model checks: definitions, email/password/name validation, password hashing, associations and paranoid option.
- Retail SQL: real database execution of initialization/seed, product/supplier CRUD, stock transaction/insufficient stock, reports, all schema changes and isolated grants/revoke exercises.
- Sequelize SQL: real signup/upsert/find, validation/duplicate checks, posts/comments, ownership rejection, eager relations, comment counts and paranoid deletion.
- MongoDB: real MongoDB 8.2.6, all 19 API tasks, validator rejection, title index, 1MiB capped logs, Int32, aggregation lookup, deletion.
- Multer teaching example: valid upload, missing file, MIME/signature/field errors and size limit.
- Saraha: real MongoDB, Argon2id hash and encrypted phone persistence, email-code confirmation and single-use rejection, login, typed tokens, refresh rotation, session revocation, role rejection, message ownership, password reset/change, Google handler branch and real decoded/re-encoded image upload.

SQL integration ran on MariaDB 10.11.14 through mysql2 and Sequelize's MySQL dialect. It did not run on the exact MySQL 8 server version; MySQL 8 compatibility is not represented as an executed test.
Saraha tests inject a mailbox, Google token verifier and Redis cache test double. They do not send external email, perform real Google OAuth, or prove live Redis connectivity. Normal startup uses real Nodemailer, Google token verification and the optional Redis client when configured. MongoDB sessions remain authoritative without Redis.
The mongosh text and LeetCode solutions are supplied; no LeetCode website submissions are claimed. Collections are exported Postman v2.1 JSON, not hosted Postman documentation pages. Saraha covers instructor topic listings; exact video-by-video parity and unspecified part boundaries are not claimed.

Commands:
- node --test tests/assignments.test.js tests/multer.test.js
- MONGO_URI=<local disposable Mongo URI> node --test tests/mongo.integration.test.js tests/saraha.integration.test.js
- DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root RUN_SQL_TESTS=1 node --test tests/sql.integration.test.js
- For local in-memory Mongo launch, install mongodb-memory-server in assignment-06-mongodb with --no-save, then set RUN_MEMORY_MONGO=1 instead of MONGO_URI.

Final combined run: all 10 test cases passed, zero failures and zero skips (node --test tests/*.test.js with RUN_SQL_TESTS=1 and RUN_MEMORY_MONGO=1).
