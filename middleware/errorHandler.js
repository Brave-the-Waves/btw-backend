const constants = require('../constants');

const errorHandler = (err, req, res, next) => {
    // Only log error type and message, not full stack
    console.error(`[Error] ${err.name || 'Unknown'}: ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }

    // Prefer an existing error status (>=400), otherwise start with 500
    let statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;

    // Treat common Mongoose errors as validation (400)
    if (err && (err.name === 'CastError' || err.name === 'ValidationError')) {
        statusCode = constants.VALIDATION_ERROR || 400;
    }

    // Allow explicit status set on the error object
    if (err && err.statusCode && Number.isInteger(err.statusCode)) {
        statusCode = err.statusCode;
    }

    // Always send a JSON response for errors to avoid hanging requests
    res.status(statusCode).json({
        title: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
        message: err && err.message ? err.message : 'An error occurred',
        stackTrace: process.env.NODE_ENV === 'production' ? undefined : err && err.stack,
    });
};

module.exports = errorHandler;