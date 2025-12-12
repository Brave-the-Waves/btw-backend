const asyncHandler = require('express-async-handler');
const User = require('../models/Users');

// @desc    Sync User with Auth0
// @route   POST /api/users/sync
// @access  Private
const syncUser = asyncHandler(async (req, res) => {
  // req.auth.payload contains the decoded Auth0 token data
  const {sub: auth0Id} = req.auth.payload;
  const { email, name } = req.body;
  console.log('Syncing user:', { auth0Id, email, name });
  // "Upsert": Update if exists, Create if new
  let user = await User.findOneAndUpdate(
    { auth0Id },
    { 
      $set: { email, name }, // Always update email/name in case they changed
      $setOnInsert: { hasPaid: false } // Only set default for new users
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  res.json(user);
});

module.exports = {
  syncUser
};
