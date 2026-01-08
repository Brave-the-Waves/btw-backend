const express = require('express');
const router = express.Router();
const { 
    getAllTeams, 
    getTeamById, 
    getTeamMembers,
    getTeamLeaderboard,
    searchTeams
} = require('../controllers/teamController');
const { optionalCheckJwt } = require('../middleware/auth');

// Public Routes
router.get('/', getAllTeams);
router.get('/leaderboard', getTeamLeaderboard);
router.get('/search', searchTeams);
router.get('/:name', optionalCheckJwt, getTeamById);
router.get('/:name/members', getTeamMembers);

module.exports = router;