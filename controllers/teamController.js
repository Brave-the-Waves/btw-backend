const express = require('express');
const Team = require('../models/Teams');
const User = require('../models/Users');
const asyncHandler = require('express-async-handler');

// @desc    Get all teams (public)
// @route   GET /api/public/teams
// @access  Public
const getAllTeams = asyncHandler(async (req, res) => {
    // Never return inviteCode in the list view
    const teams = await Team.find({}).select('-inviteCode');
    res.status(200).json(teams);
});

// @desc    Get team by name (public)
// @route   GET /api/public/teams/:name
// @access  Public (Optional Auth)
const getTeamById = asyncHandler(async (req, res) => {
    // Use findOne to get a single document
    let team = await Team.findOne({ name: req.params.name });
    
    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    // Check if the requester is the captain
    let isCaptain = false;
    
    // req.auth is populated by optionalCheckJwt if a valid token is present
    if (req.auth && req.auth.payload && req.auth.payload.sub) {
        const user = await User.findOne({ auth0Id: req.auth.payload.sub });
        // Check if user exists and is the captain
        if (user && team.captain && team.captain.equals(user._id)) {
            isCaptain = true;
        }
    }

    // If not captain, hide the invite code
    if (!isCaptain) {
        team = team.toObject(); // Convert Mongoose doc to plain object
        delete team.inviteCode;
    }

    res.status(200).json(team);
});

// @desc    Get team members
// @route   GET /api/public/teams/:name/members
// @access  Public
const getTeamMembers = asyncHandler(async (req, res) => {
    const team = await Team.findOne({ name: req.params.name }).populate({
        path: 'members',
        select: 'name amountRaised'
    });

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    res.status(200).json(team.members);
});

module.exports = {
    getAllTeams,
    getTeamById,
    getTeamMembers
};