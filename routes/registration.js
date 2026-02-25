const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const {
  createTeam,
  joinTeam,
  checkPaymentStatus,
  confirmSelection
} = require('../controllers/registrationController');

// 1. CAPTAIN PATH: Create a Team
// POST /api/registrations/team
router.post('/team', checkJwt, createTeam);

// 2. MEMBER PATH: Join a Team
// POST /api/registrations/join
router.post('/join', checkJwt, joinTeam);

// 3. CHECK STATUS
// GET /api/registrations/:id/status
router.get('/:id/status', checkJwt, checkPaymentStatus);

// 4. CONFIRM SELECTION VIA REG CODE
// POST /api/registrations/confirm-selection
router.post('/confirm-selection', checkJwt, confirmSelection);

module.exports = router;