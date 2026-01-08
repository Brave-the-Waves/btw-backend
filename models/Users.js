const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true 
  }, // firebaseUid serves as the primary key
  email: { type: String, required: false },
  name: String,
  
  // Amount raised by this user (donations attributed to them)
  amountRaised: { type: Number, default: 0 },

  // Public donation identifier (short, random) for linking donations
  donationId: { type: String, unique: true, default: () => nanoid(8) },

  // User Bio / Story
  bio: { type: String, default: '' },

  // Foreign key: Which team does this user belong to?
  team: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    default: null,
    index: true // Index for fast team member lookups
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);