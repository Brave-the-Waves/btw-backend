const asyncHandler = require('express-async-handler');
const User = require('../models/Users');
const Registration = require('../models/Registration');
const { nanoid } = require('nanoid');

// @desc    Sync User with Firebase
// @route   POST /api/users/sync
// @access  Private
const syncUser = asyncHandler(async (req, res) => {
  console.log('🔵 [SYNC] Endpoint hit - req.auth:', JSON.stringify(req.auth, null, 2));
  
  // req.auth.payload contains the decoded Firebase token data
  const {sub: firebaseUid} = req.auth.payload;
  const email = req.auth.payload.email;
  const name = req.auth.payload.name;

  if (!firebaseUid) {
    console.error('🔴 [SYNC ERROR] No firebaseUid found in token payload');
    res.status(400);
    throw new Error('Missing firebaseUid in token');
  }

  console.log('🔵 [SYNC] Syncing user:', { firebaseUid, email, name });
  
  // "Upsert": Update if exists, Create if new
  let user = await User.findOneAndUpdate(
    { _id: firebaseUid },
    { 
      $set: { email, name }, // Always update email/name in case they changed
      $setOnInsert: { amountRaised: 0, donationId: nanoid(8) } // Only set default for new users
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  console.log('🟢 [SYNC SUCCESS] User saved:', { _id: user._id, donationId: user.donationId });

  // Check existence of registration
  let registration = await Registration.findById(firebaseUid);

  // If no registration (or unpaid), check if they are part of a bundle
  if ((!registration || !registration.hasPaid) && email) {
    // Search for any registration that lists this email in bundleEmails
    // Note: bundleEmails stores emails as strings.
    const bundlePayer = await Registration.findOne({ bundleEmails: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (bundlePayer) {
        // Create/Update the record now because they ARE paid
        registration = await Registration.findOneAndUpdate(
            { _id: firebaseUid },
            { 
               hasPaid: true,
               paidBy: bundlePayer._id
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        
        // Update user role to paddler if not already
        if (user && user.role !== 'paddler') {
            user.role = 'paddler';
            await user.save();
        }

        console.log(`🟢 [SYNC SUCCESS] User ${email} found in bundle paid by ${bundlePayer._id}. Marked as paid.`);
    }
  }

  if (registration) {
      console.log('🟢 [SYNC SUCCESS] Registration status:', { _id: registration._id, hasPaid: registration.hasPaid });
  } else {
      console.log('🔵 [SYNC] No registration record found (Unpaid).');
  }

  res.json(user);
});

// @desc    Get My Status (Dashboard Info)
// @route   GET /api/users/me
// @access  Private
const getMyStatus = asyncHandler(async (req, res) => {
  // Get user and populate their team info (only needed fields)
  const user = await User.findById(req.auth.payload.sub).populate('team', 'name captain');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get registration status
  const registration = await Registration.findById(user._id);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    hasPaid: registration?.hasPaid || false,
    amountRaised: user.amountRaised,
    donationId: user.donationId,
    bio: user.bio,
    team: user.team ? {
      name: user.team.name,
      captain: user.team.captain,
      memberCount: await User.countDocuments({ team: user.team._id })
    } : null
  });
  }
);

// @desc    Update User Profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.payload.sub);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Only paddlers should be updating bios generally, but maybe regular users want to set it up before upgrading?
  // Use case: User registers, updates profile, then pays?
  // For now, allow updates but be aware.
  user.bio = req.body.bio || user.bio;
  // Allow name update if needed, but usually synced from Auth0
  if (req.body.name) user.name = req.body.name;

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    bio: updatedUser.bio
  });
});

// @desc    Get Leaderboard (Top Participants)
// @route   GET /api/participants/leaderboard
// @access  Public
const getUserLeaderboard = asyncHandler(async (req, res) => {
  const users = await User.find({ role : 'paddler' })
    .sort({ amountRaised: -1 })
    .limit(5)
    .select('name amountRaised bio team')
    .populate('team', 'name');
  
  res.json(users);
});

// @desc    Search Participants
// @route   GET /api/participants/search
// @access  Public
const searchParticipants = asyncHandler(async (req, res) => {
  const keyword = req.query.q ? {
    name: {
      $regex: req.query.q,
      $options: 'i'
    }
  } : {};

  // Only search paddlers
  const users = await User.find({ ...keyword, role: 'paddler' }).select('name bio amountRaised team').populate('team', 'name');
  res.json(users);
});

// @desc    Get Selected Participant
// @route   GET /api/participants/:id
// @access  Public
const getSelectedParticipant = asyncHandler(async (req, res) => {
  // Get user and populate their team info (only needed fields)
  const user = await User.findOne({ _id: req.params.id, role: 'paddler' }).populate('team', 'name captain members');
  
  if (!user) {
    res.status(404);
    throw new Error('Participant not found');
  }

  res.json({
    name: user.name,
    amountRaised: user.amountRaised,
    email: user.email,
    bio: user.bio,
    donationId: user.donationId,
    team: user.team ? {
      name: user.team.name,
      captain: user.team.captain,
      memberCount: await User.countDocuments({ team: user.team._id })
    } : null
  });
});

// @desc    Get All Participants
// @route   GET /api/participants/
// @access  Public
const getAllParticipants = asyncHandler(async (req, res) => {
  // Populate only team name and captain for list view
  const users = await User.find({ role: 'paddler' }).select('name amountRaised team donationId').populate('team', 'name captain');
  console.log('Fetched all participants, count:', users.length);
  res.json(users);
});

// @desc    Validate emails for bundle registration
// @route   POST /api/users/validate-emails
// @access  Private
const validateEmails = asyncHandler(async (req, res) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails)) {
    res.status(400);
    throw new Error('Please provide an array of emails');
  }

  // Normalize emails to lowercase for comparison
  const inputEmails = emails.map(e => e.toLowerCase().trim());
  
  // Find users with these emails (use regex for case-insensitive match in DB)
  const users = await User.find({ 
    email: { $in: inputEmails.map(e => new RegExp(`^${e}$`, 'i')) } 
  });

  const foundEmails = users.map(u => u.email.toLowerCase());

  // Determine which emails were NOT found
  const invalidEmails = inputEmails.filter(email => !foundEmails.includes(email));
  
  // Also check if any found users have *already paid* to prevent double payment?
  // The request specifically asked about "not found in system", but checking for payment is critical for a "pay bundle" feature.
  // However, I will stick to the requested "not found" check first. 
  // If the user wants to pay for someone who already paid, that might be a separate validation, 
  // but let's see if I can add it without breaking the contract "invalid emails".
  // For now, I'll return invalidEmails as those not found.

  if (invalidEmails.length > 0) {
      return res.json({
          valid: false,
          invalidEmails: invalidEmails,
          message: `The following emails are not registered: ${invalidEmails.join(', ')}`
      });
  }

  res.json({ valid: true });
});

module.exports = {
  syncUser,
  getMyStatus,
  getSelectedParticipant,
  updateUserProfile,
  getUserLeaderboard,
  searchParticipants,
  getAllParticipants,
  validateEmails
};
