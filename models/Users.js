const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true 
  }, // firebaseUid serves as the primary key
  email: { type: String, required: false },
  name: String,
  
  // Amount donated by this user (outbound donations)
  amountDonated: { type: Number, default: 0 },

  // Role: 'user' (default) or 'paddler'
  // When 'role' becomes 'paddler', the fields below become relevant.
  role: { 
    type: String, 
    enum: ['user', 'paddler'], 
    default: 'user' 
  },

  // --- Paddler specific fields (only relevant if role === 'paddler') ---

  // Amount raised by this user (donations attributed to them)
  amountRaised: { type: Number, default: 0 },

  // Public donation identifier (short, random) for linking donations
  // Note: We cannot enforce uniqueness or default here easily if not all users have it.
  // We will generate this ONLY when upgrading to paddler.
  donationId: { type: String, sparse: true, unique: true },

  // User Bio / Story
  bio: { type: String, default: '' },

  // Foreign key: Which team does this user belong to?
  team: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    default: null,
    index: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);