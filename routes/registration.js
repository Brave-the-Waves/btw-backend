const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const {
  createTeam,
  joinTeam,
  getMyStatus
} = require('../controllers/registrationController');

// 1. CAPTAIN PATH: Create a Team
// POST /api/registrations/team
router.post('/team', checkJwt, createTeam);

// 2. MEMBER PATH: Join a Team
// POST /api/registrations/join
router.post('/join', checkJwt, joinTeam);

module.exports = router;