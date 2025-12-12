const express = require('express');
const router = express.Router();
const { 
    getAllTeams, 
    getTeamById, 
    getTeamMembers,
    updateTeam,
    deleteTeam,
    removeMember,
    leaveTeam,
    getTeamLeaderboard,
    searchTeams
} = require('../controllers/teamController');
const { optionalCheckJwt, checkJwt } = require('../middleware/auth');

// Public Routes
router.get('/', getAllTeams);
router.get('/leaderboard', getTeamLeaderboard); // Specific routes before dynamic :name
router.get('/search', searchTeams);
router.get('/:name', optionalCheckJwt, getTeamById);
router.get('/:name/members', getTeamMembers);

// Protected Routes (Team Management)
router.put('/:id', checkJwt, updateTeam);
router.delete('/:id', checkJwt, deleteTeam);
router.delete('/:id/members/:userId', checkJwt, removeMember);
router.post('/leave', checkJwt, leaveTeam);

module.exports = router;