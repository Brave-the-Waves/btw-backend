const asyncHandler = require('express-async-handler');
const User = require('../models/Users');
const Team = require('../models/Teams');
const Donation = require('../models/Donation')
const Users = require('../models/Users');

// @ desc   Get user donations
// @ route  GET /api/donations/user/:userId
// @ access Public
const getUserDonations = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  const donations = await Donation.find({ targetUser: userId }).sort({ createdAt: -1 }).select('targetUser amount message isAnonymous createdAt donorName');
  if (!donations) {
    res.status(404);
    throw new Error('No donations found for this user');
  }

  res.status(200).json({
    success: true,
    donations: donations
  });
});

// @ desc   Get team related donations
// @ route  GET /api/donations/teams/:teamId
// @ access Public
const getTeamDonations = asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const members = await Users.find({ team: teamId }).select('_id');
    console.log('Team members:', members); 
    const donations = await Donation.find({ targetUser: { $in: members } }).sort({ createdAt: -1 }).select('targetUser amount message isAnonymous createdAt donorName');
    console.log('Donations found for team:', donations);

    if (!donations) {
        res.status(404);
        throw new Error('No donations found for this team');
    }
    
    res.status(200).json({
        success: true,
        donations: donations
    });
});

// @desc    Get donations made BY a user
// @route   GET /api/donations/made/:userId
// @access  Private
const getDonationsMadeByUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Security check: Only allow users to view their own donation history
  // req.auth is populated by checkJwt middleware
  if (req.auth.payload.sub !== userId) {
    res.status(403);
    throw new Error('Unauthorized: You can only view your own donations');
  }

  // Get user to find email
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.email) {
      // If user has no email, they probably haven't made email-linked donations or it's a temp account
      return res.status(200).json({ success: true, donations: [] });
  }

  // Find donations matched by email (case-insensitive)
  const donations = await Donation.find({ 
    donorEmail: { $regex: new RegExp(`^${user.email}$`, 'i') } 
  })
    .sort({ createdAt: -1 })
    .populate('targetUser', 'name') // Show who they donated to
    .select('amount currency status targetUser donorName createdAt isAnonymous message');
  console.log(`Donations made by user ${user.name} (${user.email}):`, donations);
  res.status(200).json({
    success: true,
    donations: donations
  });
});

module.exports = {
  getUserDonations,
  getTeamDonations,
  getDonationsMadeByUser
};

