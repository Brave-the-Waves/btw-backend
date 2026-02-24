const mongoose = require('mongoose');

const waiverSchema = new mongoose.Schema({
  // userId is the foreign key referencing the User's firebaseUid (_id)
  userId: {
    type: String,
    required: true,
    unique: true, // one waiver per user per event
    ref: 'User',
    index: true,
  },

  // -------------------------------------------------------
  // Waiver Form Fields
  // -------------------------------------------------------
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },

  dateOfBirth: { type: Date, default: null },

  emergencyContactName: { type: String, default: '' },
  emergencyContactPhone: { type: String, default: '' },

  // Paddling experience
  paddlingSide: {
    type: String,
    enum: ['left', 'right', 'ambidextrous'],
    default: null,
  },
  isExperienced: { type: Boolean, default: false },
  yearsOfExperience: { type: Number, default: null }, // only relevant if isExperienced = true

  // Safety
  medicalConditions: { type: String, default: '' }, // relevant allergies, conditions, etc.

  // Minor fields
  // dateOfBirth is used to determine minority; isMinor can also be set explicitly by the frontend
  isMinor: { type: Boolean, default: false },

  // If isMinor = true, a parent/guardian must fill these out and sign on behalf of the participant
  parentGuardianName: { type: String, default: '' },
  parentGuardianPhone: { type: String, default: '' },
  parentGuardianEmail: { type: String, default: '' },
  // Separate signature URL for parent/guardian (stored in Firebase Storage)
  parentGuardianSignatureUrl: { type: String, default: null },

  // -------------------------------------------------------
  // Waiver Completion Fields
  // -------------------------------------------------------

  // Whether the participant confirmed they have read the waiver text
  hasReadWaiver: { type: Boolean, default: false },

  // Signature image URL stored in Firebase Storage
  // Frontend draws signature on a canvas, uploads to Firebase Storage,
  // then POSTs the download URL here.
  signatureUrl: { type: String, default: null },

  // Whether the waiver is fully completed (form filled + signed)
  completed: { type: Boolean, default: false },

  // Timestamp of when the waiver was signed/submitted
  signedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Waiver', waiverSchema);
