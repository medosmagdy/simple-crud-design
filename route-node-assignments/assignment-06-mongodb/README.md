# Assignment 6 — MongoDB — Muhammad Magdy

The source PDF is labelled Assignment 7; this folder follows the announcement naming.
Node 22+, MongoDB 7+. Copy .env.example to .env, configure MONGO_URI, run npm ci and npm start. Base URL: http://localhost:3006.
All 19 tasks are in src/modules/books.js and repeated in mongosh-solutions.txt. Run the latter on a clean disposable database using mongosh <URI> --file mongosh-solutions.txt.
Import postman_collection.json and run in order: collection creation, inserts, queries, aggregations, deletion. Run setup only once per database.
Years are BSON Int32 for the integer-type query. genres is an array. Logs join books.\_id to logs.bookId; POST /logs accepts bookId as an ObjectId string. Unmatched books get an empty logs array.
Task 15's announcement mixes DELETE and GET: implemented as DELETE /books/before-year?year=2000 to avoid destructive GET requests. The collection validator rejects missing, empty and whitespace-only titles.
The Postman file is an export, not a hosted page. Bonus in bonus.js is prepared, not submitted to LeetCode.
