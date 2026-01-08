const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true 
  }, // firebaseUid serves as the primary key
  hasPaid: { type: Boolean, default: false },
  stripeCustomerId: { type: String },
  transactionId: { type: String }, // For the payment transaction
  amountPaid: { type: Number, default: 0 },
  currency: { type: String, default: 'CAD' },
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
