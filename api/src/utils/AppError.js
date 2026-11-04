/** Loi nghiep vu co ma HTTP; thong diep an toan de tra ve cho client. */
class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (errors) this.errors = errors;
  }
}

module.exports = AppError;
