import logger from '../utils/logger.js';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://hayyaticcollectionabayas.com',
  'http://hayyaticcollectionabayas.com',
  'https://www.hayyaticcollectionabayas.com',
];

const errorHandler = (err, req, res, _next) => {
  // Re-apply CORS headers so they are never missing on error responses
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  let statusCode = err.statusCode || 500;
  let message = err.message;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID provided for ${err.path || 'resource'}.`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {}).map(e => e.message).join(', ');
  }

  logger.error(err.message, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : message,
  });
};

export default errorHandler;
