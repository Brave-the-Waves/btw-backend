const express = require('express');
const router = express.Router();
const { createCheckoutSession } = require('../controllers/paymentController');

// POST /api/create-checkout-session
router.post('/create-checkout-session', createCheckoutSession);

// Note: stripe-webhook is handled directly in server.js with raw body parser

module.exports = router;
