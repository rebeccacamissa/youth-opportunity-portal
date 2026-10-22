const express = require('express');
const { listOpportunities } = require('../controllers/opportunitiesController');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(listOpportunities));

module.exports = router;
