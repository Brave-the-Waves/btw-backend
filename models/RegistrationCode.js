const mongoose = require('mongoose');

const registrationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  uses: { type: Number, required: true, default: 1 },
  teamName: { type: String, required: true }
}, { timestamps: true });

// Normalize codes to uppercase on save
registrationCodeSchema.pre('save', function() {
  if (this.code) this.code = this.code.toUpperCase();
});

module.exports = mongoose.model('RegistrationCode', registrationCodeSchema);
