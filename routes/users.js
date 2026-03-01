const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const { 
    syncUser, 
    getMyStatus, 
    updateUserProfile,
    validateEmails,
    deleteUser
} = require('../controllers/userController');

// POST /api/users/sync
// Called by frontend immediately after Firebase login
router.post('/sync', checkJwt, syncUser);

// POST /api/users/validate-emails
// Validate list of emails for bundle registration (check existence)
router.post('/validate-emails', checkJwt, validateEmails);

// GET /api/users/me
// Get current user's status (Regular User or Paddler)
router.get('/me', checkJwt, getMyStatus);

// PUT /api/users/me
// Update current user's profile
router.put('/me', checkJwt, updateUserProfile);

// DELETE /api/users/me
// Delete current user's account
router.delete('/me', checkJwt, deleteUser);

module.exports = router;
