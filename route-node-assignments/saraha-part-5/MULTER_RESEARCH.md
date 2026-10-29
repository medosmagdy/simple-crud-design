# Research: How to upload files using Multer

Multer parses multipart/form-data on Express routes. It puts text fields in req.body and uploaded files in req.file or req.files. A JSON body parser does not process multipart uploads. Install with npm install multer.

- upload.single('avatar'): one file in req.file.
- upload.array('photos',5): an array in req.files.
- upload.fields([{name:'avatar',maxCount:1}]): named arrays in req.files.
  The client field name must match. In Postman choose Body > form-data, add avatar as File, and let Postman set the multipart boundary.
  DiskStorage writes files to a directory with configurable naming; MemoryStorage holds bounded buffers for processing or forwarding. Generate server-owned random names. Apply middleware only to upload routes, limit file size/count/fields/parts, and authenticate before uploads in a real app.
  fileFilter can check a claimed MIME type, but that is client-controlled. Validate file content as well and remove rejected/orphan uploads. Extensions and MIME alone do not prove file safety; use an image decoder for real image processing. Never serve uploads as executable server code.
  Handle MulterError in Express error middleware: LIMIT_FILE_SIZE and LIMIT_UNEXPECTED_FILE should produce meaningful client errors. Do not expose server paths.
  The teaching example accepts one PNG, checks its signature, bounds file size, stores it under a UUID and does not expose the directory publicly. Signature checking is an educational minimum, not a full production image validator.
  Source: official Multer documentation https://expressjs.com/en/resources/middleware/multer/ (reviewed 2026-10-26).
