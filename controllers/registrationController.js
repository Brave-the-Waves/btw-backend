const asyncHandler = require('express-async-handler');
const Team = require('../models/Teams');
const User = require('../models/Users');
const Registration = require('../models/Registration');
const RegistrationCode = require('../models/RegistrationCode');
const Waiver = require('../models/Waiver');

// Helper to find DB user from Firebase Token
const getCurrentUser = async (firebaseUid) => {
  return await User.findById(firebaseUid);
};

// @desc    Create a Team
// @route   POST /api/registrations/team
// @access  Private
const createTeam = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.payload.sub);

  if (!user) {
    res.status(404);
    throw new Error('User not found in database. Did you sync?');
  }

  // Guard: Must pay before creating a team
  const registration = await Registration.findById(user._id);
  if (!registration || !registration.hasPaid) {
    res.status(403);
    throw new Error('You must pay your registration fee before creating a team.');
  }

  // Guard: Can't be in two teams
  if (user.team) {
    res.status(400);
    throw new Error('You are already in a team.');
  }

  // Create the team
  const newTeam = await Team.create({
    name: req.body.teamName,
    division: req.body.division,
    description: req.body.description || '',
    donationGoal: req.body.donationGoal || 0,
    captain: user._id,
  });

  // Update the User to link to this team
  user.team = newTeam._id;

  if (user.amountRaised) {
    newTeam.totalRaised = user.amountRaised;
  }
  await newTeam.save();
  await user.save();

  res.json({ 
    success: true, 
    teamName: newTeam.name, 
    inviteCode: newTeam.inviteCode 
  });
});

// @desc    Join a Team
// @route   POST /api/registrations/join
// @access  Private
const joinTeam = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const user = await getCurrentUser(req.auth.payload.sub);

  if (user.team) {
    res.status(400);
    throw new Error('You are already in a team.');
  }

  // Find team by the code
  const team = await Team.findOne({ inviteCode });
  if (!team) {
    res.status(404);
    throw new Error('Invalid invite code.');
  }

  // Add user to team
  if (user.amountRaised) {
    team.totalRaised += user.amountRaised;
    await team.save();
  }

  // Link user to team
  user.team = team._id;
  await user.save();

  res.json({ success: true, teamName: team.name });
});

// @desc    Check registration payment status
// @route   GET /api/registrations/:id/status
// @access  Private
const checkPaymentStatus = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.payload.sub);

  if (!user) {
    res.status(404);
    throw new Error('User not found in database. Did you sync?');
  }
  
  const registration = await Registration.findById(user._id);
  if (!registration || !registration.hasPaid) {
    return res.json({ isRegistered: false });
  }

  res.json({ isRegistered: true });
});

// @desc    Confirm selection via registration code and register user
// @route   POST /api/registrations/confirm-selection
// @access  Private
const confirmSelection = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    res.status(400);
    throw new Error('Registration code is required');
  }

  const user = await getCurrentUser(req.auth.payload.sub);
  if (!user) {
    res.status(404);
    throw new Error('User not found in database. Did you sync?');
  }

  const existingRegistration = await Registration.findById(user._id);
  // If user already registered and has paid, reject
  if (existingRegistration && existingRegistration.hasPaid) {
    res.status(400);
    throw new Error('User is already registered');
  }

  // Atomically decrement uses if available (case-insensitive by storing codes as uppercase)
  const normalized = code.trim().toUpperCase();
  const regCode = await RegistrationCode.findOneAndUpdate(
    { code: normalized, uses: { $gt: 0 } },
    { $inc: { uses: -1 } },
    { new: true }
  );

  if (!regCode) {
    res.status(400);
    throw new Error('Invalid or exhausted registration code');
  }

  // If a registration exists but hasn't paid, mark as paid; otherwise create a new registration
  let registration;
  if (existingRegistration) {
    existingRegistration.hasPaid = true;
    await existingRegistration.save();
    registration = existingRegistration;
  } else {
    registration = await Registration.create({ _id: user._id, hasPaid: true });
  }

  // Create a Waiver record for this user (completed = false until they sign)
  await Waiver.findOneAndUpdate(
    { userId: user._id },
    { userId: user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✅ Waiver record created for user ${user._id}`);

  user.role = 'paddler';

  // Find or create the team referenced by the code
  let team = await Team.findOne({ name: regCode.teamName });
  if (!team) {
    team = await Team.create({ name: regCode.teamName, captain: user._id, division: 'Sports' });
    user.team = team._id;
    await user.save();
    return res.json({ success: true, teamName: team.name });
  }

  // Add user to existing team
  if (user.amountRaised) {
    team.totalRaised = (team.totalRaised || 0) + user.amountRaised;
    await team.save();
  }

  user.team = team._id;
  await user.save();

  res.json({ success: true, teamName: team.name });
});


module.exports = {
  createTeam,
  joinTeam,
  checkPaymentStatus,
  confirmSelection,
};
