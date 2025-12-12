const express = require('express');
const router = express.Router();
const { getAllTeams, getTeamById } = require('../controllers/teamController');
const { optionalCheckJwt } = require('../middleware/auth');

router.get('/', getAllTeams);
router.get('/:name', optionalCheckJwt, getTeamById);

module.exports = router;