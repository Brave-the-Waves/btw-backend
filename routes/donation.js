const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const { 
    getUserDonations, 
    getTeamDonations, 
    getDonationsMadeByUser 
} = require('../controllers/donationController');

// GET /api/donations/user/:userId
// Get donations made to a specific user
router.get('/user/:userId', getUserDonations);

// GET /api/donations/teams/:teamId
// Get donations made to members of a specific team
router.get('/teams/:teamId', getTeamDonations);

// GET /api/donations/made/:userId
// Get donations made BY a specific user (Requires Auth)
router.get('/made/:userId', checkJwt, getDonationsMadeByUser);

module.exports = router;