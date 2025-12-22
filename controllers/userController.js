const asyncHandler = require('express-async-handler');
const User = require('../models/Users');
const { nanoid } = require('nanoid');

// @desc    Sync User with Auth0
// @route   POST /api/users/sync
// @access  Private
const syncUser = asyncHandler(async (req, res) => {
  // req.auth.payload contains the decoded Auth0 token data
  const {sub: auth0Id} = req.auth.payload;
  
  // Try to get email/name from Token
  // Note: Auth0 requires custom claims to be namespaced (e.g. https://btw/email)
  const email = req.auth.payload['https://btw/email'];
  const name = req.auth.payload['https://btw/name'];

  console.log('Syncing user:', { auth0Id, email, name });
  // "Upsert": Update if exists, Create if new
  let user = await User.findOneAndUpdate(
    { auth0Id },
    { 
      $set: { email, name }, // Always update email/name in case they changed
      $setOnInsert: { hasPaid: false, amountRaised: 0, donationId: nanoid(8) } // Only set default for new users
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  res.json(user);
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/users/me
// @access  Private
const getMyStatus = asyncHandler(async (req, res) => {
  // Get user and populate their team info (only needed fields)
  const user = await User.findOne({ auth0Id: req.auth.payload.sub }).populate('team', 'name captain members');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    name: user.name,
    email: user.email,
    hasPaid: user.hasPaid,
    amountRaised: user.amountRaised,
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
  const user = await User.findOne({ auth0Id: req.auth.payload.sub });

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
  const users = await User.find({}).select('name amountRaised team').populate('team', 'name captain');
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
