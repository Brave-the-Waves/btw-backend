const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/Users');
const Team = require('../models/Teams');
const Registration = require('../models/Registration');

// @desc    Create Stripe Checkout Session
// @route   POST /api/create-checkout-session
// @access  Public
const createCheckoutSession = asyncHandler(async (req, res) => {
  console.log('Creating checkout session with body:', req.body);
  const { amount, currency, donationId } = req.body;

  // Basic validation
  if (!amount || !currency) {
    res.status(400);
    throw new Error('Please provide amount and currency');
  }

  // Optional: Verify paddler exists if provided via public donationId
  let metadata = {};
  metadata.type = 'donation';
  if (donationId) {
    const paddler = await User.findOne({ donationId });
    if (paddler) {
      metadata.donationId = donationId;
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
            name: donationId ? `Donation to ${metadata.paddlerName}` : 'Donation to Brave The Waves',
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
    metadata: metadata, // Store donationId here so we can retrieve it in the webhook later
  });

  console.log('Created Stripe Checkout Session:', session.id);
  console.log('Session url:', session.url);
  // Return the URL for the frontend to redirect to
  res.json({ url: session.url });
});

// @desc    Create Registration Payment Checkout Session
// @route   POST /api/create-registration-checkout
// @access  Private (requires authentication)
const createRegistrationCheckout = asyncHandler(async (req, res) => {
  const firebaseUid = req.auth.payload.sub;
  const { amount = 25, currency = 'CAD' } = req.body; // Default $25 CAD registration fee

  // Find the user
  const user = await User.findOne({ firebaseUid });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if already paid
  const registration = await Registration.findOne({ user: user._id });
  if (registration?.hasPaid) {
    res.status(400);
    throw new Error('Registration fee already paid');
  }

  // Create Stripe checkout session for registration
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: 'Brave The Waves - Registration Fee',
            description: 'Event registration payment',
          },
          unit_amount: Math.round(amount * 100), // Convert dollars to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/btw-frontend/registration=success`,
    cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/btw-frontend/registration=cancel`,
    metadata: {
      type: 'registration',
      userId: user._id.toString(),
      firebaseUid: user.firebaseUid,
    },
    customer_email: user.email,
  });

  console.log('Created Registration Checkout Session:', session.id, 'for user:', user.email);
  res.json({ url: session.url });
});

// @desc    Handle Stripe Webhook Events
// @route   POST /api/stripe-webhook
// @access  Public (but verified with Stripe signature)
const stripeWebhook = asyncHandler(async (req, res) => {
  console.log('------------------------------');
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

    const paymentType = session.metadata?.type;
    const amountPaid = (session.amount_total || 0) / 100; // Convert cents to dollars

    // Handle REGISTRATION payment
    if (paymentType === 'registration') {
      const userId = session.metadata?.userId;
      const user = await User.findById(userId);

      if (user) {
        const registration = await Registration.findOneAndUpdate(
          { user: user._id },
          {
            hasPaid: true,
            stripeCustomerId: session.customer,
            transactionId: session.payment_intent,
            amountPaid: amountPaid,
            currency: session.currency?.toUpperCase(),
          },
          { new: true, upsert: true }
        );

        console.log(`✅ Registration payment completed for ${user.email} - Amount: $${amountPaid}`);
        console.log(`Registration record updated:`, registration._id);
      } else {
        console.error(`❌ Registration payment: User not found with ID ${userId}`);
      }
    }
    // Handle DONATION payment
    else {
      const donationId = session.metadata?.donationId;

      if (!donationId) {
        console.log('No donationId in metadata - donation not attributed to a specific user');
      } else {
        // Update the user's amountRaised by donationId
        const user = await User.findOne({ donationId });

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
        } else {
          console.log(`No user found with donationId=${donationId}`);
        }
      }
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

module.exports = {
  createCheckoutSession,
  createRegistrationCheckout,
  stripeWebhook
};
