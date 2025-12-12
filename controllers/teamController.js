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

// @desc    Update Team (Captain Only)
// @route   PUT /api/teams/:id
// @access  Private
const updateTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    const user = await User.findOne({ auth0Id: req.auth.payload.sub });

    if (!user || !team.captain.equals(user._id)) {
        res.status(401);
        throw new Error('Not authorized as team captain');
    }

    team.name = req.body.name || team.name;
    team.division = req.body.division || team.division;
    team.description = req.body.description || team.description;

    const updatedTeam = await team.save();
    res.json(updatedTeam);
});

// @desc    Delete Team (Captain Only)
// @route   DELETE /api/teams/:id
// @access  Private
const deleteTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);

    if (!team) {
        res.status(404);
        throw new Error('Team not found');
    }

    const user = await User.findOne({ auth0Id: req.auth.payload.sub });

    if (!user || !team.captain.equals(user._id)) {
        res.status(401);
        throw new Error('Not authorized as team captain');
    }

    // Remove team reference from all members
    await User.updateMany(
        { team: team._id },
        { $set: { team: null } }
    );

    await team.deleteOne();
    res.json({ message: 'Team removed' });
});

// @desc    Remove Member (Captain Only)
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private
const removeMember = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    const memberToRemove = await User.findById(req.params.userId);

    if (!team || !memberToRemove) {
        res.status(404);
        throw new Error('Team or User not found');
    }

    const user = await User.findOne({ auth0Id: req.auth.payload.sub });

    if (!user || !team.captain.equals(user._id)) {
        res.status(401);
        throw new Error('Not authorized as team captain');
    }

    if (team.captain.equals(memberToRemove._id)) {
        res.status(400);
        throw new Error('Captain cannot remove themselves. Delete the team instead.');
    }

    // Remove from team members array
    team.members = team.members.filter(memberId => !memberId.equals(memberToRemove._id));
    await team.save();

    // Remove team reference from user
    memberToRemove.team = null;
    await memberToRemove.save();

    res.json({ message: 'Member removed' });
});

// @desc    Leave Team
// @route   POST /api/teams/leave
// @access  Private
const leaveTeam = asyncHandler(async (req, res) => {
    const user = await User.findOne({ auth0Id: req.auth.payload.sub });

    if (!user || !user.team) {
        res.status(400);
        throw new Error('User not in a team');
    }

    const team = await Team.findById(user.team);

    if (team.captain.equals(user._id)) {
        res.status(400);
        throw new Error('Captain cannot leave. Delete the team or transfer captaincy.');
    }

    // Remove from team members array
    team.members = team.members.filter(memberId => !memberId.equals(user._id));
    await team.save();

    // Remove team reference from user
    user.team = null;
    await user.save();

    res.json({ message: 'Left team successfully' });
});

// @desc    Get Team Leaderboard
// @route   GET /api/public/teams/leaderboard
// @access  Public
const getTeamLeaderboard = asyncHandler(async (req, res) => {
    // Aggregate to sum up amountRaised from members
    // Note: This assumes we want to calculate it on the fly.
    // If performance becomes an issue, store totalRaised on Team model.
    const teams = await Team.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'members',
                foreignField: '_id',
                as: 'memberDetails'
            }
        },
        {
            $addFields: {
                totalRaised: { $sum: '$memberDetails.amountRaised' },
                memberCount: { $size: '$members' }
            }
        },
        { $sort: { totalRaised: -1 } },
        { $limit: 10 },
        {
            $project: {
                name: 1,
                division: 1,
                totalRaised: 1,
                memberCount: 1,
                description: 1
            }
        }
    ]);

    res.json(teams);
});

// @desc    Search Teams
// @route   GET /api/public/teams/search
// @access  Public
const searchTeams = asyncHandler(async (req, res) => {
    const keyword = req.query.q ? {
        name: {
            $regex: req.query.q,
            $options: 'i'
        }
    } : {};

    const teams = await Team.find({ ...keyword }).select('name division description members');
    res.json(teams);
});

module.exports = {
    getAllTeams,
    getTeamById,
    getTeamMembers,
    updateTeam,
    deleteTeam,
    removeMember,
    leaveTeam,
    getTeamLeaderboard,
    searchTeams
};