const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const { createCheckoutSession, createRegistrationCheckout } = require('../controllers/paymentController');

// POST /api/create-checkout-session
// Create a Stripe checkout session for donations
router.post('/create-checkout-session', createCheckoutSession);

// POST /api/create-registration-checkout
// Create a Stripe checkout session for registration fee (requires auth)
router.post('/create-registration-checkout', checkJwt, createRegistrationCheckout);

// Note: stripe-webhook is handled directly in server.js with raw body parser

module.exports = router;
