function requestLogger(request, _response, next) {
  console.log(`[${request.method}] ${request.originalUrl}`);
  next();
}

module.exports = requestLogger;
