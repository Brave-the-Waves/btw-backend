const express = require('express');
const router = express.Router();
const checkJwt = require('../middleware/auth');
const { syncUser } = require('../controllers/userController');

// POST /api/users/sync
// Called by frontend immediately after Auth0 login
router.post('/sync', checkJwt, syncUser);

module.exports = router;