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

module.exports = {
  getUserDonations,
  getTeamDonations
};

