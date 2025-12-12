const asyncHandler = require('express-async-handler');
const Team = require('../models/Team');
const User = require('../models/User');

// Helper to find DB user from Auth0 Token
const getCurrentUser = async (auth0Id) => {
  return await User.findOne({ auth0Id });
};

// @desc    Create a Team
// @route   POST /api/registrations/team
// @access  Private
const createTeam = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.payload.sub);

  // Guard: Must pay before creating a team
  if (!user.hasPaid) {
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
    captain: user._id,
    members: [user._id] // Captain is the first member
  });

  // Update the User to link to this team
  user.team = newTeam._id;
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
  team.members.push(user._id);
  await team.save();

  // Link user to team
  user.team = team._id;
  await user.save();

  res.json({ success: true, teamName: team.name });
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/registrations/me
// @access  Private
const getMyStatus = asyncHandler(async (req, res) => {
  // Get user and populate their team info
  const user = await User.findOne({ auth0Id: req.auth.payload.sub }).populate('team');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    hasPaid: user.hasPaid,
    team: user.team ? {
      name: user.team.name,
      inviteCode: user.team.inviteCode,
      isCaptain: user.team.captain.equals(user._id),
      memberCount: user.team.members.length
    } : null
  });
});

module.exports = {
  createTeam,
  joinTeam,
  getMyStatus
};
