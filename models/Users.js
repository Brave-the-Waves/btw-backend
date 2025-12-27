const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String, 
    required: true, 
    unique: true 
  }, // The unique ID from Firebase
  email: { type: String, required: false },
  name: String,
  
  // Amount raised by this user (donations attributed to them)
  amountRaised: { type: Number, default: 0 },

  // Public donation identifier (short, random) for linking donations
  donationId: { type: String, unique: true, default: () => nanoid(8) },

  // User Bio / Story
  bio: { type: String, default: '' },

  // Relationship: Which team do they belong to?
  team: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    default: null 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);