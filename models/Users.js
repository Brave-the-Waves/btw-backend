const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0Id: { 
    type: String, 
    required: true, 
    unique: true 
  }, // The unique ID from Auth0
  email: { type: String, required: false },
  name: String,
  hasPaid: { type: Boolean, default: false },
  stripeCustomerId: String, // For tracking payments later
  
  // Relationship: Which team do they belong to?
  team: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    default: null 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);