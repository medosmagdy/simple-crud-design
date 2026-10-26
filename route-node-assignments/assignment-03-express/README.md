# assignment-03-express — Muhammad Magdy

Run `npm install` then `npm start` (Node 22+). Base URL: `http://localhost:3003`.
Data is read from and written to `data/users.json` using fs on each operation. Users are stored as an object keyed by UUID, never as an in-memory user array. Writes are serialized and atomically renamed within this single process. Run one server process per file.
POST `/user` accepts `{"name":"Ahmed","email":"ahmed@example.com","age":25}`.
GET `/user` lists users; GET `/user/:id` reads one; PATCH `/user/:id` accepts one or more editable fields; DELETE `/user/:id` removes one.
400 = invalid input, 404 = missing user, 409 = duplicate email. Emails are normalized to lowercase.
Import `postman_collection.json` into Postman. Run Add User first: its test saves `userId` for subsequent requests. The collection includes example responses and status assertions. It is an exported collection, not a hosted Postman documentation page.
Bonus code is prepared locally; no LeetCode submission is claimed.
Express also supports DELETE `/user` with a JSON id, GET `/user/getByName?name=Ahmed`, and GET `/user/filter?minAge=18`.
