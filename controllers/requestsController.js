const { randomUUID } = require('crypto');

const requests = new Map();
const allowedTypes = new Set(['general', 'report', 'suggest', 'feedback']);
const allowedStatuses = new Set(['pending', 'in_progress', 'resolved', 'rejected']);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFound() {
  const error = new Error('Service request not found.');
  error.status = 404;
  return error;
}

function listRequests(_request, response) {
  response.status(200).json([...requests.values()]);
}

function getRequest(request, response, next) {
  const item = requests.get(request.params.id);
  if (!item) return next(notFound());
  return response.status(200).json(item);
}

function createRequest(request, response, next) {
  try {
    const body = request.body || {};
    const type = String(body.type || body.submission_type || '').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const listingUrl = String(body.listing_url || '').trim();

    if (!allowedTypes.has(type)) throw badRequest('Choose a valid request type.');
    if (!name || name.length > 120) throw badRequest('Name is required and must be 120 characters or fewer.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw badRequest('Enter a valid email address.');
    }
    if (!subject || subject.length > 200) throw badRequest('Subject is required and must be 200 characters or fewer.');
    if (!message || message.length > 5000) throw badRequest('Message is required and must be 5000 characters or fewer.');
    if (listingUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(listingUrl);
      } catch {
        throw badRequest('Listing URL must be a valid HTTP or HTTPS URL.');
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw badRequest('Listing URL must use HTTP or HTTPS.');
      }
    }

    const item = {
      id: randomUUID(),
      type,
      name,
      email,
      subject,
      listing_url: listingUrl || null,
      message,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    requests.set(item.id, item);
    return response.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
}

function updateRequest(request, response, next) {
  const item = requests.get(request.params.id);
  if (!item) return next(notFound());
  const status = String(request.body?.status || '').trim();
  if (!allowedStatuses.has(status)) {
    return next(badRequest('Status must be pending, in_progress, resolved, or rejected.'));
  }
  const updated = { ...item, status, updated_at: new Date().toISOString() };
  requests.set(updated.id, updated);
  return response.status(200).json({ success: true, data: updated });
}

function deleteRequest(request, response, next) {
  if (!requests.has(request.params.id)) return next(notFound());
  requests.delete(request.params.id);
  return response.status(200).json({ success: true, message: 'Service request deleted.' });
}

module.exports = {
  createRequest,
  deleteRequest,
  getRequest,
  listRequests,
  updateRequest
};
