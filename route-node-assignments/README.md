# Route C48 — Node.js assignments

Muhammad Magdy. Each folder is independent. Requires Node.js 22+.

| Assignment      | Folder                   | Contents                                                                |
| --------------- | ------------------------ | ----------------------------------------------------------------------- |
| JavaScript      | assignment-01-javascript | 15 answers, essays, Counter II                                          |
| Core Modules    | assignment-02-core       | 20 functions, native HTTP API, Postman, bonus                           |
| Express         | assignment-03-express    | theory, JSON CRUD/search/filter, Postman, bonus                         |
| MySQL           | assignment-04-mysql      | ERDs/mappings, retail API, seed, schema/permissions SQL, Postman, bonus |
| Sequelize       | assignment-05-sequelize  | models/hooks, users/posts/comments API, Postman, bonus                  |
| MongoDB         | assignment-06-mongodb    | 19 API tasks and mongosh equivalents, Postman, bonus                    |
| Saraha          | saraha-app               | Cumulative Mongoose app covering the instructor topic listings; Postman |
| Multer research | saraha-pending           | Report and runnable upload example                                      |

Read each README, run npm ci and npm start in the relevant folder. Copy .env.example where supplied and set local credentials. Do not deploy these teaching APIs publicly without real authentication.
Postman exports have meaningful names, captured IDs, status assertions and documentation. They are not hosted Postman documentation pages. Bonus solutions are prepared locally, not submitted to a LeetCode account.
Tests: install API dependencies then run node --test tests/assignments.test.js. For Mongo integration set MONGO_URI and run node --test tests/mongo.integration.test.js. See VALIDATION.md for executed checks.
Express part 2 uses the supplied Express PDF solution because no additional tasks were specified. Saraha is a cumulative implementation of the instructor folder topics, with no claim of exact video parity or official per-part boundaries.

For the complete local test set, also run npm ci in saraha-app and saraha-pending/multer-example. SQL tests need administrator access to create/drop the explicitly named route_test_store and route_test_social databases and store_manager_test user on a disposable local database server. They must never point at production.
