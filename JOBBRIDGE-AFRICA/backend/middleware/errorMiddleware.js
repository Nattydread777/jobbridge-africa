import mongoose from 'mongoose';

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = 'Resource not found (Invalid ID)';
    statusCode = 404;
  }

  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  if (
    mongoose.connection.readyState !== 1 &&
    /^(Mongoose|Mongo)/.test(err.name)
  ) {
    message = 'Database is temporarily unavailable. Please retry shortly.';
    statusCode = 503;
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
