const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Sync User with Auth0
// @route   POST /api/users/sync
// @access  Private
const syncUser = asyncHandler(async (req, res) => {
  // req.auth.payload contains the decoded Auth0 token data
  const {sub: auth0Id, email, name} = req.auth.payload;

  // "Upsert": Update if exists, Create if new
  let user = await User.findOneAndUpdate(
    { auth0Id },
    { 
      $setOnInsert: { email, name, hasPaid: false } 
    },
    { new: true, upsert: true } // Return the new doc, create if missing
  );

  res.json(user);
});

module.exports = {
  syncUser
};
