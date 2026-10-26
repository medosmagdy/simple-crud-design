# Assignment 5 — Sequelize — Muhammad Magdy

Node 22+, MySQL 8+. Create route_social database, copy .env.example to .env, configure credentials, run npm ci and npm start. Sequelize sync creates tables without dropping them. Base URL: http://localhost:3005.
Models: User uses define; Post/Comment use init. Includes associations, timestamps, paranoid posts, built-in isEmail, checkPasswordLength (>6), named checkNameLength beforeCreate hook (>2). Passwords use salted scrypt and are excluded from responses.
The users/posts/comments modules implement all specified endpoints. Import postman_collection.json and run in order on a fresh database. PUT /users/:id builds or updates by PK with validate:false as required; beforeCreate still checks the name on creation. Database constraints remain active.
Ownership compares body userId with the stored owner, following the exercise. This is identity simulation, not real authentication; use locally.
Post body: title, content, userId. Bulk comments accept an array or {comments:[...]}, with content, userId, postId per entry. Search matches literal substrings. Deleting a post soft-deletes it.
The Postman file is an export, not a hosted page. Bonus in bonus.js is prepared, not submitted to LeetCode.
