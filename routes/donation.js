const express = require('express');
const router = express.Router();
const { getUserDonations, getTeamDonations } = require('../controllers/donationController');

// GET /api/donations/user/:userId
// Get donations made to a specific user
router.get('/user/:userId', getUserDonations);

// GET /api/donations/teams/:teamId
// Get donations made to members of a specific team
router.get('/teams/:teamId', getTeamDonations);

module.exports = router;