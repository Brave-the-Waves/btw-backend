const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/Users');
const Team = require('../models/Teams');

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

// @desc    Handle Stripe Webhook Events
// @route   POST /api/stripe-webhook
// @access  Public (but verified with Stripe signature)
const stripeWebhook = asyncHandler(async (req, res) => {
  console.log('🔔 Webhook received!');
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('Webhook secret configured:', endpointSecret ? 'YES' : 'NO');
  console.log('Stripe signature present:', sig ? 'YES' : 'NO');

  let event;

  try { 
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified. Event type:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    res.status(400);
    throw new Error(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log('Payment succeeded for session:', session.id);
    
    // Extract metadata
    const paddlerId = session.metadata?.paddlerId;
    const amountPaid = session.amount_total / 100; // Convert cents to dollars

    if (paddlerId) {
      // Update the user's amountRaised
      const user = await User.findById(paddlerId);
      
      if (user) {
        user.amountRaised += amountPaid;
        await user.save();
        
        console.log(`Updated ${user.name}'s amountRaised to $${user.amountRaised}`);

        // Update the team's totalRaised if user is on a team
        if (user.team) {
          const team = await Team.findById(user.team);
          
          if (team) {
            team.totalRaised += amountPaid;
            await team.save();
            
            console.log(`Updated team ${team.name}'s totalRaised to $${team.totalRaised}`);
          }
        }
      }
    } else {
      console.log('No paddlerId in metadata - donation not attributed to a specific user');
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

module.exports = {
  createCheckoutSession,
  stripeWebhook
};
