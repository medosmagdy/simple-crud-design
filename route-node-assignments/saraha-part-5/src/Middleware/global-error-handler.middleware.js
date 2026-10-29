import multer from "multer";
export function globalErrorHandler(error, req, res, next) {
  const status =
    error.statusCode ||
    (error.code === 11000
      ? 409
      : error.name === "ValidationError" || error.name === "CastError"
        ? 400
        : error instanceof multer.MulterError
          ? error.code === "LIMIT_FILE_SIZE"
            ? 413
            : 400
          : 500);
  res
    .status(status)
    .json({
      message:
        status === 500
          ? "Internal server error"
          : error.code === 11000
            ? "Email already exists"
            : error.message,
      code: error.code || "REQUEST_FAILED",
      ...(error.data ? { data: error.data } : {}),
    });
}
