const asyncHandler = require('express-async-handler');
const User = require('../models/Users');
const Registration = require('../models/Registration');
const { nanoid } = require('nanoid');

// @desc    Sync User with Firebase
// @route   POST /api/users/sync
// @access  Private
const syncUser = asyncHandler(async (req, res) => {
  console.log('🔵 [SYNC] Endpoint hit - req.auth:', JSON.stringify(req.auth, null, 2));
  
  // req.auth.payload contains the decoded Firebase token data
  const {sub: firebaseUid} = req.auth.payload;
  const email = req.auth.payload.email;
  const name = req.auth.payload.name;

  if (!firebaseUid) {
    console.error('🔴 [SYNC ERROR] No firebaseUid found in token payload');
    res.status(400);
    throw new Error('Missing firebaseUid in token');
  }

  console.log('🔵 [SYNC] Syncing user:', { firebaseUid, email, name });
  
  // "Upsert": Update if exists, Create if new
  let user = await User.findOneAndUpdate(
    { firebaseUid },
    { 
      $set: { email, name }, // Always update email/name in case they changed
      $setOnInsert: { amountRaised: 0, donationId: nanoid(8) } // Only set default for new users
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  console.log('🟢 [SYNC SUCCESS] User saved:', { _id: user._id, firebaseUid: user.firebaseUid, donationId: user.donationId });

  // Ensure Registration record exists for this user
  const registration = await Registration.findOneAndUpdate(
    { user: user._id },
    {},
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log('🟢 [SYNC SUCCESS] Registration created/updated:', { _id: registration._id, hasPaid: registration.hasPaid });

  res.json(user);
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/users/me
// @access  Private
const getMyStatus = asyncHandler(async (req, res) => {
  // Get user and populate their team info (only needed fields)
  const user = await User.findOne({ firebaseUid: req.auth.payload.sub }).populate('team', 'name captain members');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get registration status
  const registration = await Registration.findOne({ user: user._id });

  res.json({
    name: user.name,
    email: user.email,
    hasPaid: registration?.hasPaid || false,
    amountRaised: user.amountRaised,
    donationId: user.donationId,
    bio: user.bio,
    team: user.team ? {
      name: user.team.name,
      captain: user.team.captain,
      memberCount: user.team.members.length
    } : null
  });
});

// @desc    Update User Profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.auth.payload.sub });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.bio = req.body.bio || user.bio;
  // Allow name update if needed, but usually synced from Auth0
  if (req.body.name) user.name = req.body.name;

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    bio: updatedUser.bio
  });
});

// @desc    Get Leaderboard (Top Participants)
// @route   GET /api/users/leaderboard
// @access  Public
const getUserLeaderboard = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .sort({ amountRaised: -1 })
    .limit(5)
    .select('name amountRaised bio team')
    .populate('team', 'name');
  
  res.json(users);
});

// @desc    Search Users
// @route   GET /api/users/search
// @access  Public
const searchUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.q ? {
    name: {
      $regex: req.query.q,
      $options: 'i'
    }
  } : {};

  const users = await User.find({ ...keyword }).select('name bio amountRaised team').populate('team', 'name');
  res.json(users);
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/users/:id
// @access  Public
const getSelectedUser = asyncHandler(async (req, res) => {
  // Get user and populate their team info (only needed fields)
  const user = await User.findById(req.params.id).populate('team', 'name captain members');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    name: user.name,
    amountRaised: user.amountRaised,
    email: user.email,
    bio: user.bio,
    donationId: user.donationId,
    team: user.team ? {
      name: user.team.name,
      captain: user.team.captain,
      memberCount: user.team.members.length
    } : null
  });
});

// @desc    Get All Users
// @route   GET /api/users/
// @access  Public
const getAllUsers = asyncHandler(async (req, res) => {
  // Populate only team name and captain for list view
  const users = await User.find({}).select('name amountRaised team donationId').populate('team', 'name captain');
  res.json(users);
});

module.exports = {
  syncUser,
  getMyStatus,
  getSelectedUser,
  updateUserProfile,
  getUserLeaderboard,
  searchUsers,
  getAllUsers
};
