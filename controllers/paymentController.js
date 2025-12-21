const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/Users');

// @desc    Create Stripe Checkout Session
// @route   POST /api/create-checkout-session
// @access  Public
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { amount, currency, paddlerId } = req.body;

  // Basic validation
  if (!amount || !currency) {
    res.status(400);
    throw new Error('Please provide amount and currency');
  }

  // Optional: Verify paddler exists if provided
  let metadata = {};
  if (paddlerId) {
    const paddler = await User.findById(paddlerId);
    if (paddler) {
      metadata.paddlerId = paddlerId;
      metadata.paddlerName = paddler.name;
    }
  }

  // Create the session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: paddlerId ? `Donation to ${metadata.paddlerName}` : 'Donation to Brave The Waves',
            description: 'Charity Event Donation',
          },
          unit_amount: Math.round(amount * 100), // Convert dollars to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.CLIENT_URL || 'http://localhost:5173/btw-frontend'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173/btw-frontend'}/cancel`,
    metadata: metadata, // Store paddlerId here so we can retrieve it in the webhook later
  });

  console.log('Created Stripe Checkout Session:', session.id);
  console.log('Session url:', session.url);
  // Return the URL for the frontend to redirect to
  res.json({ url: session.url });
});

module.exports = {
  createCheckoutSession
};
