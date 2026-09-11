// middleware/errorHandler.js
// Centralized error handler. Keeps the process alive on network timeouts,
// missing API keys, upstream API failures, etc. Every route should call
// next(err) on failure instead of throwing raw.

function errorHandler(err, req, res, next) {
  const status = err.status || err.response?.status || 500;

  // Try to surface a useful message without leaking stack traces to clients.
  let message = err.message || "Internal server error.";

  // Axios errors from upstream APIs (Groq / ElevenLabs) carry response data.
  if (err.response?.data) {
    const upstream = err.response.data;
    if (Buffer.isBuffer(upstream)) {
      message = `Upstream API error (status ${err.response.status})`;
    } else if (typeof upstream === "object") {
      message = upstream.error?.message || upstream.message || message;
    }
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(status).json({
    error: true,
    code: err.code || "INTERNAL_ERROR",
    message,
  });
}

// Catches async route handler rejections without needing try/catch everywhere.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
