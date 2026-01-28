const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const { 
  createCheckoutSession, 
  createRegistrationCheckout,
  createBundleRegistrationCheckout
} = require('../controllers/paymentController');

// POST /api/create-checkout-session
// Create a Stripe checkout session for donations
router.post('/create-checkout-session', createCheckoutSession);

// POST /api/create-registration-checkout
// Create a Stripe checkout session for registration fee (requires auth)
router.post('/create-registration-checkout', checkJwt, createRegistrationCheckout);

// POST /api/create-bundle-registration-checkout
// Create a Stripe checkout session for bundle registration fee (requires auth)
router.post('/create-bundle-registration-checkout', checkJwt, createBundleRegistrationCheckout);

// Note: stripe-webhook is handled directly in server.js with raw body parser

module.exports = router;
