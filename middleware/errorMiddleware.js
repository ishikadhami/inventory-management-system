function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  let statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  let message = error.message || "Server error";

  if (error.code === 11000) {
    statusCode = 409;
    message = "A product with this SKU already exists";
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    statusCode = 400;
  }

  res.status(statusCode).json({ message });
}

module.exports = { notFound, errorHandler };