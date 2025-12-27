const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  hasPaid: { type: Boolean, default: false },
  stripeCustomerId: { type: String },
  transactionId: { type: String }, // For the payment transaction
  amountPaid: { type: Number, default: 0 },
  currency: { type: String, default: 'CAD' },
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
