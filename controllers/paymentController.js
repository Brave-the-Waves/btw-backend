const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.NODE_ENV == 'production' ? process.env.STRIPE_PROD_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY);
const User = require('../models/Users');
const Team = require('../models/Teams');
const Registration = require('../models/Registration');
const Donation = require('../models/Donation');

// @desc    Create Stripe Checkout Session
// @route   POST /api/create-checkout-session
// @access  Public
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { amount, currency, donationId, message, isAnonymous } = req.body;
  const email = req.auth?.payload?.email;
  console.log('Donation details:', { amount, currency, donationId, message, isAnonymous, email });

  // Basic validation
  if (!amount || !currency) {
    res.status(400);
    throw new Error('Please provide amount and currency');
  }

  // Optional: Verify paddler exists if provided via public donationId
  let metadata = {};
  metadata.type = 'donation';
  metadata.message = (message || '').substring(0, 500); // Limit to 500 chars
  metadata.isAnonymous = isAnonymous || false
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
    customer_creation: 'always', // Always create a Stripe Customer to track donors
    customer_email: email, // Pre-populate email if provided
    success_url: `${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173'}/cancel`,
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
  console.log('Creating registration checkout session for user:', firebaseUid);
  const { amount = 25, currency = 'CAD' } = req.body; // Default $25 CAD registration fee

  // Find the user
  const user = await User.findById(firebaseUid);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if already paid
  const registration = await Registration.findById(firebaseUid);
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
    customer_creation: 'always', // Always create a Stripe Customer
    success_url: `${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173'}/registration=success`,
    cancel_url: `${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173'}/registration=cancel`,
    metadata: {
      type: 'registration',
      userId: user._id.toString(),
    },
    customer_email: user.email,
  });

  console.log('Created Registration Checkout Session:', session.id, 'for user:', user.email);
  res.json({ url: session.url });
});

// @desc    Create Bundle Registration Payment Checkout Session
// @route   POST /api/create-bundle-registration-checkout
// @access  Private
const createBundleRegistrationCheckout = asyncHandler(async (req, res) => {
  const firebaseUid = req.auth.payload.sub;
  console.log('Creating bundle registration checkout session for user:', firebaseUid);
  // Default amount if not provided, though for bundle it should probably be passed
  const { amount, currency = 'CAD', bundleEmails } = req.body; 

  if (!amount) {
     res.status(400);
     throw new Error('Amount is required for bundle registration');
  }

  if (!bundleEmails || !Array.isArray(bundleEmails) || bundleEmails.length === 0) {
     res.status(400);
     throw new Error('Bundle emails are required');
  }

  const user = await User.findById(firebaseUid);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Serialize emails for metadata
  // Limit check: 500 chars per key in Stripe Metadata.
  const emailsStr = JSON.stringify(bundleEmails);
  // Optional: check length of emailsStr and handle if too long (e.g. by truncating or throwing error) within 500 chars

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: `Brave The Waves - Bundle Registration (${bundleEmails.length} participants)`,
            description: 'Group Event registration payment',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_creation: 'always', 
    success_url: `${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173'}/registration=success`,
    cancel_url: `${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173'}/registration=cancel`,
    metadata: {
      type: 'bundle_registration',
      userId: user._id.toString(),
      emails: emailsStr
    },
    customer_email: user.email,
  });

  console.log('Created Bundle Registration Checkout Session:', session.id, 'for user:', user.email);
  res.json({ url: session.url });
});

// @desc    Handle Stripe Webhook Events
// @route   POST /api/stripe-webhook
// @access  Public (but verified with Stripe signature)
const stripeWebhook = asyncHandler(async (req, res) => {
  console.log('------------------------------');
  console.log('🔔 Webhook received!');
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.NODE_ENV === 'production' ? process.env.STRIPE_PROD_WEBHOOK_SECRET : process.env.STRIPE_TEST_WEBHOOK_SECRET;

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
    const paymentType = session.metadata?.type;
    const amountPaid = (session.amount_total || 0) / 100; // Convert cents to dollars

    // Handle REGISTRATION payment
    if (paymentType === 'registration') {
      const userId = session.metadata?.userId;
      let user = await User.findById(userId);

      if (user) {
        const registration = await Registration.findOneAndUpdate(
          { _id: user._id },
          {
            hasPaid: true,
            stripeCustomerId: session.customer,
            transactionId: session.payment_intent,
            amountPaid: amountPaid,
            currency: session.currency?.toUpperCase(),
          },
          { new: true, upsert: true }
        );
        
        // Update user role to paddler
        user.role = 'paddler';
        await user.save();
        
      } else {
        console.error(`❌ Registration payment: User not found with ID ${userId}`);
      }
    }
    // Handle BUNDLE REGISTRATION payment
    else if (paymentType === 'bundle_registration') {
      const userId = session.metadata?.userId;
      const emailsStr = session.metadata?.emails;
      const bundleEmails = emailsStr ? JSON.parse(emailsStr) : [];
      
      let user = await User.findById(userId);

      if (user) {
        // Update Payer
        const registration = await Registration.findOneAndUpdate(
          { _id: user._id },
          {
            hasPaid: true,
            stripeCustomerId: session.customer,
            transactionId: session.payment_intent,
            amountPaid: amountPaid,
            currency: session.currency?.toUpperCase(),
            bundleEmails: bundleEmails
          },
          { new: true, upsert: true }
        );
        
        // Payer becomes a paddler
        user.role = 'paddler';
        await user.save();
        
        console.log(`Updated Payer ${user.email} registration for bundle.`);

        // Update Beneficiaries if they exist
        for (const email of bundleEmails) {
             // Find user by email
             const benefUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
             if (benefUser) {
                 await Registration.findOneAndUpdate(
                     { _id: benefUser._id },
                     { 
                         hasPaid: true,
                         paidBy: user._id
                     },
                     { upsert: true }
                 );
                 // Update beneficiary to paddler
                 benefUser.role = 'paddler';
                 await benefUser.save();

                 console.log(`Marked beneficiary ${email} as paid.`);
             } else {
                 console.log(`Beneficiary ${email} not found in Users system yet. match will happen on sync.`);
             }
        }

      } else {
        console.error(`❌ Bundle Registration payment: User not found with ID ${userId}`);
      }
    }
    // Handle DONATION payment
    else {
      const donationId = session.metadata?.donationId;
      let targetUserId = null;

      if (!donationId) {
        console.log('No donationId in metadata - donation not attributed to a specific user');
      } else {
        // Update the user's amountRaised by donationId
        const user = await User.findOne({ donationId });

        if (user) {
          targetUserId = user._id; // Save for donation record
          
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

      // Update the DONOR's total donated amount if they are a registered user matches the email used
      const donorEmail = session.customer_details?.email;
      if (donorEmail) {
        // Find user by email (case-insensitive search safer for email)
        const donorUser = await User.findOne({ 
          email: { $regex: new RegExp(`^${donorEmail}$`, 'i') } 
        });
        
        if (donorUser) {
           // Initialize if undefined/null (handles legacy records)
           if (donorUser.amountDonated === undefined || donorUser.amountDonated === null) {
              donorUser.amountDonated = 0;
           }
           
           donorUser.amountDonated += amountPaid;
           await donorUser.save();
           console.log(`Updated donor ${donorUser.name} (${donorUser.email}) amountDonated to $${donorUser.amountDonated}`);
        }
      }

      console.log('------------------------------');
      console.log(`✅ Donation payment completed - Amount: $${amountPaid}`);
      console.log('Creating donation record in database...');
      // Record the donation in the Donations collection
      const donationRecord = await Donation.create({
        stripePaymentIntentId: session.payment_intent,
        stripeCustomerId: session.customer, 
        stripeCheckoutSessionId: session.id,
        amount: amountPaid,
        currency: session.currency.toUpperCase(),
        status: 'completed',
        donorName: session.customer_details?.name || 'Anonymous',
        donorEmail: session.customer_details?.email || 'Anonymous',
        targetUser: targetUserId,
        message: session.metadata?.message || '',
        isAnonymous: session.metadata?.isAnonymous === 'true' || false
      });
      console.log('Donation record created:', { id: donationRecord._id, amount: donationRecord.amount});
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

module.exports = {
  createCheckoutSession,
  createRegistrationCheckout,
  createBundleRegistrationCheckout,
  stripeWebhook
};
