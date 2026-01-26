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
    { _id: firebaseUid },
    { 
      $set: { email, name }, // Always update email/name in case they changed
      $setOnInsert: { amountRaised: 0, donationId: nanoid(8) } // Only set default for new users
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  console.log('🟢 [SYNC SUCCESS] User saved:', { _id: user._id, donationId: user.donationId });

  // Ensure Registration record exists for this user
  const registration = await Registration.findOneAndUpdate(
    { _id: firebaseUid },
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
  const user = await User.findById(req.auth.payload.sub).populate('team', 'name captain');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get registration status
  const registration = await Registration.findById(user._id);

  const baseResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    hasPaid: registration?.hasPaid || false,
  };

  if (user.role === 'paddler') {
    res.json({
      ...baseResponse,
      amountRaised: user.amountRaised,
      donationId: user.donationId,
      bio: user.bio,
      team: user.team ? {
        name: user.team.name,
        captain: user.team.captain,
        memberCount: await User.countDocuments({ team: user.team._id })
      } : null
    });
  } else {
    // Regular user sees limited info
    res.json(baseResponse);
  }
});

// @desc    Update User Profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.payload.sub);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Only paddlers should be updating bios generally, but maybe regular users want to set it up before upgrading?
  // Use case: User registers, updates profile, then pays?
  // For now, allow updates but be aware.
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
// @route   GET /api/participants/leaderboard
// @access  Public
const getUserLeaderboard = asyncHandler(async (req, res) => {
  const users = await User.find({ role : 'paddler' })
    .sort({ amountRaised: -1 })
    .limit(5)
    .select('name amountRaised bio team')
    .populate('team', 'name');
  
  res.json(users);
});

// @desc    Search Participants
// @route   GET /api/participants/search
// @access  Public
const searchParticipants = asyncHandler(async (req, res) => {
  const keyword = req.query.q ? {
    name: {
      $regex: req.query.q,
      $options: 'i'
    }
  } : {};

  // Only search paddlers
  const users = await User.find({ ...keyword, role: 'paddler' }).select('name bio amountRaised team').populate('team', 'name');
  res.json(users);
});

// @desc    Get Selected Participant
// @route   GET /api/participants/:id
// @access  Public
const getSelectedParticipant = asyncHandler(async (req, res) => {
  // Get user and populate their team info (only needed fields)
  const user = await User.findOne({ _id: req.params.id, role: 'paddler' }).populate('team', 'name captain members');
  
  if (!user) {
    res.status(404);
    throw new Error('Participant not found');
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
      memberCount: await User.countDocuments({ team: user.team._id })
    } : null
  });
});

// @desc    Get All Participants
// @route   GET /api/participants/
// @access  Public
const getAllParticipants = asyncHandler(async (req, res) => {
  // Populate only team name and captain for list view
  const users = await User.find({ role: 'paddler' }).select('name amountRaised team donationId').populate('team', 'name captain');
  console.log('Fetched all participants, count:', users.length);
  res.json(users);
});

module.exports = {
  syncUser,
  getMyStatus,
  getSelectedParticipant,
  updateUserProfile,
  getUserLeaderboard,
  searchParticipants,
  getAllParticipants
};
