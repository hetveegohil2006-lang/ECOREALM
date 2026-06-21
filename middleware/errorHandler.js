/**
 * Global error handling middleware.
 * Renders cyberpunk HTML error pages for browser requests,
 * and returns structured JSON for API/AJAX requests.
 * @param {Error} err - The error object thrown or passed via next(err).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // Log the error for server diagnostics
  console.error(`[ERROR] ${statusCode} — ${message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Determine if the request expects HTML (browser navigation) or JSON (API/AJAX)
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
  const isApiRoute = req.path.startsWith('/api/');

  if (acceptsHtml && !isApiRoute) {
    // Render the appropriate cyberpunk error view
    return res.status(statusCode).render(
      statusCode === 404 ? '404' : '500',
      { err: process.env.NODE_ENV !== 'production' ? err : null, path: req.path }
    );
  }

  // JSON response for API consumers
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

