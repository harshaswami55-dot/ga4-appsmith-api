export class HttpError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "HttpError";
  }
}

