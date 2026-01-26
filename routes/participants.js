const express = require('express');
const router = express.Router();
const { 
    getUserLeaderboard, 
    searchParticipants,
    getSelectedParticipant,
    getAllParticipants
} = require('../controllers/userController');

// GET /api/participants/leaderboard
// Get top participants
router.get('/leaderboard', getUserLeaderboard);

// GET /api/participants/search
// Search participants by name ~ NOT USED
router.get('/search', searchParticipants);

// GET /api/participants/:id
// Get a specific participant's profile (Paddlers only)
router.get('/:id', getSelectedParticipant);

// GET /api/participants
// Get all participants (Paddlers only)
router.get('/', getAllParticipants);

module.exports = router;
