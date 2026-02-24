const asyncHandler = require('express-async-handler');
const Waiver = require('../models/Waiver');
const User = require('../models/Users');

// @desc    Get waiver completion status for a user
// @route   GET /api/waivers/:userId/status
// @access  Private
const getWaiverStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const requestingUid = req.auth.payload.sub;

  // Users can only check their own waiver status (unless future admin role added)
  if (requestingUid !== userId) {
    res.status(403);
    throw new Error('Not authorized to view this waiver.');
  }

  const waiver = await Waiver.findOne({ userId });

  if (!waiver) {
    return res.json({ exists: false, completed: false });
  }

  res.json({
    exists: true,
    completed: waiver.completed,
    signedAt: waiver.signedAt,
    hasReadWaiver: waiver.hasReadWaiver,
    hasSignature: !!waiver.signatureUrl,
  });
});

// @desc    Get full waiver data for a user
// @route   GET /api/waivers/:userId
// @access  Private
const getWaiver = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const requestingUid = req.auth.payload.sub;

  if (requestingUid !== userId) {
    res.status(403);
    throw new Error('Not authorized to view this waiver.');
  }

  const waiver = await Waiver.findOne({ userId });

  if (!waiver) {
    res.status(404);
    throw new Error('Waiver not found. Please contact support.');
  }

  res.json(waiver);
});

// @desc    Submit (fill out + sign) the waiver form
// @route   PUT /api/waivers/:userId
// @access  Private
//
// Expected body:
// {
//   firstName, lastName, email, phone,
//   dateOfBirth,
//   emergencyContactName, emergencyContactPhone,
//   paddlingSide,           // 'left' | 'right' | 'ambidextrous'
//   isExperienced,          // boolean
//   yearsOfExperience,      // number (only if isExperienced)
//   medicalConditions,      // string (optional)
//   isMinor,                // boolean - if true, parent/guardian fields are required
//   parentGuardianName,     // required if isMinor
//   parentGuardianPhone,    // required if isMinor
//   parentGuardianEmail,    // required if isMinor
//   parentGuardianSignatureUrl, // required if isMinor (Firebase Storage URL)
//   hasReadWaiver,          // must be true to complete
//   signatureUrl,           // Firebase Storage download URL for participant signature (or parent if minor)
// }
const submitWaiver = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const requestingUid = req.auth.payload.sub;

  if (requestingUid !== userId) {
    res.status(403);
    throw new Error('Not authorized to submit this waiver.');
  }

  const waiver = await Waiver.findOne({ userId });

  if (!waiver) {
    res.status(404);
    throw new Error('Waiver record not found. Please contact support.');
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    emergencyContactName,
    emergencyContactPhone,
    paddlingSide,
    isExperienced,
    yearsOfExperience,
    medicalConditions,
    isMinor,
    parentGuardianName,
    parentGuardianPhone,
    parentGuardianEmail,
    parentGuardianSignatureUrl,
    hasReadWaiver,
    signatureUrl,
  } = req.body;

  // Validate required fields before marking complete
  const missingFields = [];
  if (!firstName) missingFields.push('firstName');
  if (!lastName) missingFields.push('lastName');
  if (!email) missingFields.push('email');
  if (!phone) missingFields.push('phone');
  if (!emergencyContactName) missingFields.push('emergencyContactName');
  if (!emergencyContactPhone) missingFields.push('emergencyContactPhone');
  if (!paddlingSide) missingFields.push('paddlingSide');
  if (!hasReadWaiver) missingFields.push('hasReadWaiver (must confirm you have read the waiver)');
  if (!signatureUrl) missingFields.push('signatureUrl');

  // If participant is a minor, parent/guardian fields are required
  if (isMinor) {
    if (!parentGuardianName) missingFields.push('parentGuardianName');
    if (!parentGuardianPhone) missingFields.push('parentGuardianPhone');
    if (!parentGuardianEmail) missingFields.push('parentGuardianEmail');
    if (!parentGuardianSignatureUrl) missingFields.push('parentGuardianSignatureUrl');
  }

  if (missingFields.length > 0) {
    res.status(400);
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Update fields
  waiver.firstName = firstName;
  waiver.lastName = lastName;
  waiver.email = email;
  waiver.phone = phone;
  waiver.dateOfBirth = dateOfBirth || null;
  waiver.emergencyContactName = emergencyContactName;
  waiver.emergencyContactPhone = emergencyContactPhone;
  waiver.paddlingSide = paddlingSide;
  waiver.isExperienced = isExperienced || false;
  waiver.yearsOfExperience = isExperienced ? (yearsOfExperience || null) : null;
  waiver.medicalConditions = medicalConditions || '';
  waiver.isMinor = isMinor || false;
  waiver.parentGuardianName = isMinor ? (parentGuardianName || '') : '';
  waiver.parentGuardianPhone = isMinor ? (parentGuardianPhone || '') : '';
  waiver.parentGuardianEmail = isMinor ? (parentGuardianEmail || '') : '';
  waiver.parentGuardianSignatureUrl = isMinor ? (parentGuardianSignatureUrl || null) : null;
  waiver.hasReadWaiver = hasReadWaiver;
  waiver.signatureUrl = signatureUrl;
  waiver.completed = true;
  waiver.signedAt = new Date();

  await waiver.save();

  res.json({
    success: true,
    message: 'Waiver submitted successfully.',
    waiverId: waiver._id,
    completed: waiver.completed,
    signedAt: waiver.signedAt,
  });
});

module.exports = {
  getWaiverStatus,
  getWaiver,
  submitWaiver,
};
