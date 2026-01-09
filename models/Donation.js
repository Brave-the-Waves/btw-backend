const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  // Stripe identifiers (critical for webhooks & reconciliation)
  stripePaymentIntentId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  stripeCustomerId: String,
  stripeCheckoutSessionId: String,
  
  // Transaction details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'CAD' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Donor information (from Stripe customer data)
  donorName: String,
  donorEmail: String,
  
  // Attribution - which paddler gets credit?
  targetUser: { 
    type: String, // firebaseUid
    ref: 'User',
    default: null, // null = general/untargeted donation
    index: true // Fast lookup for "show me donations to this user"
  },
  
  // Optional features
  message: { type: String, default: '' },
  isAnonymous: { type: Boolean, default: false }
  
}, { timestamps: true }); // createdAt for "when"

// Compound index for efficient paddler dashboard queries
donationSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);