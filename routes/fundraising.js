const express = require('express');
const router = express.Router();

const { getFundraisingLiveExport } = require('../controllers/fundraisingController');

// GET /api/fundraising-live
// Export participant fundraising totals as CSV for Google Sheets
router.get('/fundraising-live', getFundraisingLiveExport);

module.exports = router;