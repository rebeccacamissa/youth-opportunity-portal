const express = require('express');
const {
  createRequest,
  deleteRequest,
  getRequest,
  listRequests,
  updateRequest
} = require('../controllers/requestsController');

const router = express.Router();

router.get('/', listRequests);
router.get('/:id', getRequest);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.patch('/:id', updateRequest);
router.delete('/:id', deleteRequest);

module.exports = router;
