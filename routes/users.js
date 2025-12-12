const express = require('express');
const router = express.Router();
const { checkJwt } = require('../middleware/auth');
const { syncUser, getMyStatus, getSelectedUser } = require('../controllers/userController');

// POST /api/users/sync
// Called by frontend immediately after Auth0 login
router.post('/sync', checkJwt, syncUser);

// GET /api/users/me
// Get current user's status
router.get('/me', checkJwt, getMyStatus);

// GET /api/users/:id
// Get a specific user's profile
router.get('/:id', getSelectedUser);

module.exports = router;