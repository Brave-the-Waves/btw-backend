const mongoose = require('mongoose');
const { nanoid } = require('nanoid'); // You'll need: npm install nanoid

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  
  inviteCode: { 
    type: String, 
    default: () => nanoid(6).toUpperCase(), 
    unique: true 
  },

  captain: { 
    type: String, // firebaseUid, since User._id is now String
    ref: 'User', 
    required: true 
  },

  division: {
    type: String,
    enum: ['Community', 'Corporate', 'Survivor', 'Student'], //subject to change in the future, maybe there are no such things such as divisions
    default: 'Community'
  },

  description: { type: String, default: '' },

  totalRaised: { type: Number, default: 0 },

  donationGoal: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);