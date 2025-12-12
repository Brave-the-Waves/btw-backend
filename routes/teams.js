const express = require('express');
const router = express.Router();
const { getAllTeams, getTeamById, getTeamMembers } = require('../controllers/teamController');
const { optionalCheckJwt } = require('../middleware/auth');

router.get('/', getAllTeams);
router.get('/:name', optionalCheckJwt, getTeamById);
router.get('/:name/members', getTeamMembers);

module.exports = router;