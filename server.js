require('dotenv').config();

const cors = require('cors');
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const opportunitiesRouter = require('./routes/opportunities');
const requestsRouter = require('./routes/requests');

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/api/health', (_request, response) => {
  response.json({ success: true, message: 'Youth Opportunity Portal API is running.' });
});
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/requests', requestsRouter);

app.use((_request, _response, next) => {
  const error = new Error('Route not found.');
  error.status = 404;
  next(error);
});
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Youth Opportunity Portal API listening on http://localhost:${port}`);
});
