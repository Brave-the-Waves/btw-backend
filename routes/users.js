const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const { 
    syncUser, 
    getMyStatus, 
    updateUserProfile
} = require('../controllers/userController');

// POST /api/users/sync
// Called by frontend immediately after Firebase login
router.post('/sync', checkJwt, syncUser);

// GET /api/users/me
// Get current user's status (Regular User or Paddler)
router.get('/me', checkJwt, getMyStatus);

// PUT /api/users/me
// Update current user's profile
router.put('/me', checkJwt, updateUserProfile);

module.exports = router;
