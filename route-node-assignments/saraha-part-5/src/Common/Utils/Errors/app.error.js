export default class HttpAppError extends Error {
  constructor(message, statusCode = 400, data = null, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.code = code;
  }
}
