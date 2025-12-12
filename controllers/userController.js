const asyncHandler = require('express-async-handler');
const User = require('../models/Users');

// @desc    Sync User with Auth0
// @route   POST /api/users/sync
// @access  Private
const syncUser = asyncHandler(async (req, res) => {
  // req.auth.payload contains the decoded Auth0 token data
  const {sub: auth0Id} = req.auth.payload;
  const { email, name } = req.body;
  console.log('Syncing user:', { auth0Id, email, name });
  // "Upsert": Update if exists, Create if new
  let user = await User.findOneAndUpdate(
    { auth0Id },
    { 
      $set: { email, name }, // Always update email/name in case they changed
      $setOnInsert: { hasPaid: false, amountRaised: 0 } // Only set default for new users
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  res.json(user);
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/users/me
// @access  Private
const getMyStatus = asyncHandler(async (req, res) => {
  // Get user and populate their team info
  const user = await User.findOne({ auth0Id: req.auth.payload.sub }).populate('team');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    name: user.name,
    email: user.email,
    hasPaid: user.hasPaid,
    amountRaised: user.amountRaised,
    team: user.team ? {
      name: user.team.name,
      captain: user.team.captain,
      memberCount: user.team.members.length
    } : null
  });
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/users/:id
// @access  Public
const getSelectedUser = asyncHandler(async (req, res) => {
  // Get user and populate their team info
  const user = await User.findById(req.params.id).populate('team');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    name: user.name,
    amountRaised: user.amountRaised,
    email: user.email,
    team: user.team ? {
      name: user.team.name,
      captain: user.team.captain,
      memberCount: user.team.members.length
    } : null
  });
});

module.exports = {
  syncUser,
  getMyStatus,
  getSelectedUser
};
