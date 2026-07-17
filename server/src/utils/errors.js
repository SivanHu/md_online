export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: message,
    details: err.details || undefined,
  });
}
