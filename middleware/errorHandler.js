function errorHandler(error, _request, response, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error);
  response.status(status).json({
    success: false,
    message: status >= 500 ? 'An unexpected server error occurred.' : error.message
  });
}

module.exports = errorHandler;
