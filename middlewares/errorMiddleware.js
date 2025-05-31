// backend/middlewares/errorMiddleware.js

// Handle 404 errors - Route not found
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the next error handling middleware
};

// General error handler
const errorHandler = (err, req, res, next) => {
  // Sometimes an error might come with a status code, otherwise default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  res.json({
    success: false, // Added for consistency with other responses
    message: err.message,
    // Provide stack trace only in development mode
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };