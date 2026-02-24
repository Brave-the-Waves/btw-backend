const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const {
  getWaiverStatus,
  getWaiver,
  submitWaiver,
} = require('../controllers/waiverController');

// GET /api/waivers/:userId/status  - check if waiver is completed
router.get('/:userId/status', checkJwt, getWaiverStatus);

// GET /api/waivers/:userId         - fetch full waiver data
router.get('/:userId', checkJwt, getWaiver);

// PUT /api/waivers/:userId         - submit / sign the waiver
router.put('/:userId', checkJwt, submitWaiver);

module.exports = router;
