import HttpAppError from "./app.error.js";
export class BadRequestException extends HttpAppError {
  constructor(message, data = null, code = "BAD_REQUEST") {
    super(message, 400, data, code);
  }
}
export class UnauthorizedException extends HttpAppError {
  constructor(message = "Invalid authentication") {
    super(message, 401, null, "UNAUTHORIZED");
  }
}
export class NotFoundException extends HttpAppError {
  constructor(message = "Not found") {
    super(message, 404, null, "NOT_FOUND");
  }
}
export class ConflictException extends HttpAppError {
  constructor(message) {
    super(message, 409, null, "CONFLICT");
  }
}
