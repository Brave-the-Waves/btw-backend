const express = require('express');
const router = express.Router();
const { 
    updateTeam,
    deleteTeam,
    removeMember,
    leaveTeam
} = require('../controllers/teamController');
const { checkJwt } = require('../middleware/auth');

// All routes require authentication
router.use(checkJwt);

// Team Management Routes
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.delete('/:id/members/:userId', removeMember);
router.post('/leave', leaveTeam);

module.exports = router;
