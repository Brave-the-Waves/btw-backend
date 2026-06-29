const asyncHandler = require('express-async-handler');
const User = require('../models/Users');
const Registration = require('../models/Registration');
const Team = require('../models/Teams');
const Donation = require('../models/Donation');
const Waiver = require('../models/Waiver');
const { isAdminEmail } = require('../middleware/auth');
const auditLog = require('../utils/auditLogger');

// Get admin dashboard statistics
// GET /api/admin/stats
const getAdminStats = asyncHandler(async (req, res) => {
  // Count total users in the system
  const totalMembers = await User.countDocuments();

  // Count users who have paid registration (hasPaid = true)
  const registeredMembers = await User.countDocuments({ role: 'paddler' });

  // Count total teams
  const totalTeams = await Team.countDocuments();

  // Sum all registration payments (where hasPaid = true)
  const registrationData = await Registration.aggregate([
    { $match: { hasPaid: true } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } }
  ]);
  const registrationRevenue = registrationData[0]?.total || 0;

  // Sum all donations
  const donationData = await Donation.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const donationRevenue = donationData[0]?.total || 0;

  // Calculate total revenue
  const totalRevenue = registrationRevenue + donationRevenue;

  res.json({
    totalMembers,
    registeredMembers,
    totalTeams,
    registrationRevenue,
    donationRevenue,
    totalRevenue
  });
});

// Get all members with optional search and status filter
// GET /api/admin/members
const getAllMembers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;

  // Build filter object
  let filter = { accountStatus: { $ne: 'deleted' } }; 

  // Apply search filter (case-insensitive by name)
  if (search && search.trim()) {
    filter.name = { $regex: search.trim(), $options: 'i' };
  }

  // Apply status filter (registered = role 'paddler', non-registered = role 'user')
  if (status === 'registered') {
    filter.role = 'paddler';
  } else if (status === 'non-registered') {
    filter.role = 'user';
  }

  const members = await User.find(filter)
    .select('_id name email role team accountStatus createdAt amountRaised')
    .populate('team', 'name')
    .lean();

  // Fetch all waivers for these members 
  const memberIds = members.map(m => m._id);
  const waivers = await Waiver.find({ userId: { $in: memberIds } }).lean();

  // Create a map of userId 
  const waiverMap = {};
  waivers.forEach(waiver => {
    waiverMap[waiver.userId] = waiver.completed === true;
  });

  const response = members.map(member => ({
    _id: member._id,
    name: member.name,
    email: member.email,
    team: member.team,
    amountRaised: member.amountRaised || 0,
    isRegistered: member.role === 'paddler',
    hasSignedWaiver: waiverMap[member._id] || false,
    accountStatus: member.accountStatus,
    createdAt: member.createdAt
  }));

  res.json(response);
});

// Get single member details
// GET /api/admin/members/:id
const getMemberDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const member = await User.findById(id).populate('team', 'name captain');

  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  // Get registration data
  const registration = await Registration.findById(id);

  // Get waiver status - query by userId 
  const waiver = await Waiver.findOne({ userId: id });

  res.json({
    _id: member._id,
    name: member.name,
    email: member.email,
    role: member.role,
    bio: member.bio,
    picture: member.picture,
    team: member.team,
    amountRaised: member.amountRaised,
    isRegistered: member.role === 'paddler',
    hasSignedWaiver: waiver && waiver.completed === true,
    isAdmin: isAdminEmail(member.email),
    accountStatus: member.accountStatus,
    createdAt: member.createdAt,
    registration: registration,
    waiver: waiver
  });
});

// Update member profile
// PATCH /api/admin/members/:id
const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bio, name, picture } = req.body;

  const member = await User.findById(id);

  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  // Update allowed fields
  if (bio !== undefined) member.bio = bio;
  if (name !== undefined) member.name = name;
  if (picture !== undefined) member.picture = picture;

  const updated = await member.save();

  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    bio: updated.bio,
    picture: updated.picture
  });
});

// Update member bio 
// PATCH /api/admin/members/:id/bio
const updateMemberBio = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bio } = req.body;

  const member = await User.findById(id);

  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  member.bio = bio || '';
  const updated = await member.save();

  res.json({
    _id: updated._id,
    bio: updated.bio
  });
});

// Deactivate member account (soft delete)
// PATCH /api/admin/members/:id/deactivate
const deactivateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.auth?.payload?.sub;

  const member = await User.findById(id);

  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  member.accountStatus = 'disabled';
  await member.save();

  // Audit log the deactivation
  await auditLog({
    action: 'DEACTIVATE_MEMBER',
    adminId,
    targetId: id,
    details: `Disabled account: ${member.name}`
  });

  res.json({
    _id: member._id,
    accountStatus: member.accountStatus,
    message: 'Member account disabled'
  });
});

// Reactivate member account
// PATCH /api/admin/members/:id/reactivate
const reactivateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.auth?.payload?.sub;

  const member = await User.findById(id);

  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  member.accountStatus = 'active';
  await member.save();

  // Audit log the reactivation
  await auditLog({
    action: 'REACTIVATE_MEMBER',
    adminId,
    targetId: id,
    details: `Reactivated account: ${member.name}`
  });

  res.json({
    _id: member._id,
    accountStatus: member.accountStatus,
    message: 'Member account reactivated'
  });
});

// Delete member permanently
// DELETE /api/admin/members/:id
const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.auth?.payload?.sub;
  const session = await User.startSession();
  let member;

  try {
    await session.withTransaction(async () => {
      member = await User.findById(id).session(session);

      if (!member) {
        res.status(404);
        throw new Error('Member not found');
      }

      const memberTotalRaised = Number(member.totalRaised) || 0;
      const teamUpdate = {
        $set: { captain: null },
        $pull: { members: member._id }
      };

      if (memberTotalRaised > 0) {
        teamUpdate.$inc = { totalRaised: -memberTotalRaised };
      }

      await Team.updateMany(
        {
          $or: [
            { captain: member._id },
            { members: member._id }
          ]
        },
        teamUpdate,
        { session }
      );

      await User.deleteOne({ _id: member._id }).session(session);
    });
  } finally {
    await session.endSession();
  }

  // Audit log the deletion
  await auditLog({
    action: 'DELETE_MEMBER',
    adminId,
    targetId: id,
    details: `Deleted member: ${member.name} (${member.email})`
  });

  res.json({
    _id: member._id,
    message: 'Member deleted permanently'
  });
});


// Get all teams 
// GET /api/admin/teams
const getAdminTeams = asyncHandler(async (req, res) => {
  const { search } = req.query;

  let filter = {};

  // Apply search filter (case-insensitive by name)
  if (search && search.trim()) {
    filter.name = { $regex: search.trim(), $options: 'i' };
  }

  // Query with filter
  const teams = await Team.find(filter)
    .populate('captain', 'name email')
    .lean();

  // Map to response format with member count and total donations
  const response = await Promise.all(
    teams.map(async (team) => {
      // Fetch members for this team
      const members = await User.find({ team: team._id })
        .select('_id name email')
        .lean();
    
      const memberCount = members.length;
    
      return {
        _id: team._id,
        name: team.name,
        description: team.description,
        division: team.division,
        captain: team.captain,
        memberCount,
        members, 
        totalDonations: team.totalRaised || 0,
        inviteCode: team.inviteCode
      };
    })
  );

  res.json(response);
});

// Create a new team 
// POST /api/admin/teams
const createAdminTeam = asyncHandler(async (req, res) => {
  const { name, description, division, captainId } = req.body;
  let captainUser = null;

  // Validate required fields
  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Team name is required');
  }

  // Check if team name already exists
  const existingTeam = await Team.findOne({ name });
  if (existingTeam) {
    res.status(400);
    throw new Error('Team name already exists');
  }

  // If captain provided, verify they exist
  let finalCaptainId = captainId;
  if (captainId) {
    captainUser = await User.findById(captainId);
    if (!captainUser) {
      res.status(404);
      throw new Error('Captain user not found');
    }
    finalCaptainId = captainId;
  } else {
    res.status(400);
    throw new Error('Captain ID is required');
  }

  // Create team
  const team = new Team({
    name: name.trim(),
    description: description?.trim() || '',
    division: division || 'Community',
    captain: finalCaptainId
  });

  const savedTeam = await team.save();
  captainUser.team = savedTeam._id;
  await captainUser.save();

  res.json(savedTeam);
});

// Update team info 
// PATCH /api/admin/teams/:id
const updateAdminTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, division } = req.body;

  const team = await Team.findById(id);

  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  // Update fields (admin can change anything except captain here)
  if (name !== undefined && name.trim()) {
    // Check if new name conflicts with other teams
    const conflict = await Team.findOne({ name: name.trim(), _id: { $ne: id } });
    if (conflict) {
      res.status(400);
      throw new Error('Team name already exists');
    }
    team.name = name.trim();
  }

  if (description !== undefined) {
    team.description = description.trim();
  }

  if (division !== undefined) {
    team.division = division;
  }

  const updated = await team.save();

  res.json(updated);
});

// Set team captain 
// PATCH /api/admin/teams/:id/captain
const setAdminTeamCaptain = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { captainId } = req.body;

  if (!captainId) {
    res.status(400);
    throw new Error('Captain ID is required');
  }

  const team = await Team.findById(id);

  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  const newCaptain = await User.findById(captainId);

  if (!newCaptain) {
    res.status(404);
    throw new Error('New captain user not found');
  }

  if (newCaptain.team && newCaptain.team.toString() !== team._id.toString()) {
    res.status(400);
    throw new Error('New captain must already belong to this team');
  }

  if (!newCaptain.team) {
    newCaptain.team = team._id;
    await newCaptain.save();
  }

  // Update captain
  team.captain = captainId;
  const updated = await team.save();

  res.json(updated);
});

// Delete team (admin)
// DELETE /api/admin/teams/:id
const deleteAdminTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.auth?.payload?.sub;

  const team = await Team.findById(id);

  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  // Remove team reference from all members
  await User.updateMany(
    { team: team._id },
    { $set: { team: null } }
  );

  await team.deleteOne();

  // Audit log the deletion
  await auditLog({
    action: 'DELETE_TEAM',
    adminId,
    targetId: id,
    details: `Deleted team: ${team.name}`
  });

  res.json({
    _id: team._id,
    message: 'Team deleted'
  });
});

// Manage team members (add, remove, or move)
// PATCH /api/admin/teams/:id/members
const manageAdminTeamMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, memberIds, targetTeamId, moveDonations } = req.body;

  if (!action || !['add', 'remove', 'move'].includes(action)) {
    res.status(400);
    throw new Error('Action must be "add", "remove", or "move"');
  }

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400);
    throw new Error('Member IDs array is required and must not be empty');
  }

  const team = await Team.findById(id);

  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  const members = await User.find({ _id: { $in: memberIds } });

  if (members.length === 0) {
    res.status(404);
    throw new Error('No members found with provided IDs');
  }

  if (action === 'add') {
    // Add members to this team
    for (const member of members) {
      if (member.team && member.team.toString() !== id) {
        // Member is already in a different team, remove contributions first
        const oldTeam = await Team.findById(member.team);
        if (oldTeam && member.amountRaised) {
          oldTeam.totalRaised -= member.amountRaised;
          await oldTeam.save();
        }
      }
      member.team = id;
      if (member.amountRaised) {
        team.totalRaised += member.amountRaised;
      }
      await member.save();
    }
    await team.save();
  } else if (action === 'remove') {
    // Remove members from this team
    for (const member of members) {
      if (member.team?.toString() === id) {
        if (member.amountRaised) {
          team.totalRaised -= member.amountRaised;
        }
        member.team = null;
        await member.save();
      }
    }
    await team.save();
  } else if (action === 'move') {
    // Move members to another team
    if (!targetTeamId) {
      res.status(400);
      throw new Error('Target team ID is required for move action');
    }

    const targetTeam = await Team.findById(targetTeamId);

    if (!targetTeam) {
      res.status(404);
      throw new Error('Target team not found');
    }

    if (targetTeamId === id) {
      res.status(400);
      throw new Error('Target team cannot be the same as source team');
    }

    for (const member of members) {
      if (member.team?.toString() === id) {
        // Remove from source team
        if (member.amountRaised) {
          team.totalRaised -= member.amountRaised;
          if (moveDonations) {
            // Add to target team
            targetTeam.totalRaised += member.amountRaised;
          }
        }
        // Move to target team
        member.team = targetTeamId;
        await member.save();
      }
    }

    await team.save();
    await targetTeam.save();
  }

  res.json({
    _id: team._id,
    message: `Members ${action}ed successfully`,
    team
  });
});


// Helper: Normalize registration status
const normalizeRegistrationStatus = (item) => {
  const raw = String(item?.status || '').toLowerCase();
  if (raw === 'completed' || raw === 'paid' || raw === 'succeeded') return 'completed';
  if (raw === 'pending' || raw === 'processing') return 'pending';
  if (raw === 'failed' || raw === 'canceled') return 'failed';
  if (item?.hasPaid === true) return 'completed';
  if (item?.hasPaid === false) return 'pending';
  return 'pending';
};

// Helper: Normalize donation status
const normalizeDonationStatus = (item) => {
  const raw = String(item?.status || '').toLowerCase();
  if (raw === 'completed' || raw === 'paid' || raw === 'succeeded') return 'completed';
  return 'pending';
};

// Helper: Normalize receipt status
const normalizeReceiptStatus = (item) => {
  const raw = String(item?.status || '').toLowerCase();
  return raw === 'issued' ? 'issued' : 'pending';
};

// Helper: Check if date falls within range
const dateWithinRange = (dateString, fromDate, toDate) => {
  if (!fromDate && !toDate) return true;
  if (!dateString) return false;

  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return false;

  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    if (value < from) return false;
  }

  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    if (value > to) return false;
  }

  return true;
};

// Get registrations with optional filters
// GET /api/admin/finance/registrations
const getFinanceRegistrations = asyncHandler(async (req, res) => {
  const { fromDate, toDate, status } = req.query;

  const registrations = await Registration.find({}).lean();

  const userIds = registrations.map(reg => reg._id);

  const users = await User.find({ _id: { $in: userIds } }).lean();

  const userMap = {};
  users.forEach(user => {
    userMap[user._id] = user;
  });

  const normalized = registrations.map((reg, index) => {
    const user = userMap[reg._id] || {};
    return {
      id: reg._id || String(index),
      name: user?.name || 'Unknown',
      email: user?.email || 'Unknown',
      amountPaid: Number(reg.amountPaid) || 0,
      transactionId: reg.transactionId || reg.stripeCustomerId || 'N/A',
      registrationDate: reg.updatedAt || reg.createdAt || null,
      status: normalizeRegistrationStatus(reg)
    };
  });

  const filtered = normalized.filter(row => {
    const dateOk = dateWithinRange(row.registrationDate, fromDate, toDate);
    const statusOk = !status || status === 'all' || row.status === status;
    return dateOk && statusOk;
  });

  res.json(filtered);
});

// Get donations with optional filters
// GET /api/admin/finance/donations
const getFinanceDonations = asyncHandler(async (req, res) => {
  const { fromDate, toDate, status } = req.query;

  // Query all donations
  const donations = await Donation.find({})
    .populate('targetUser', 'name')
    .lean();

  // Normalize donations
  const normalized = donations.map((don, index) => {
    const targetUser = don.targetUser || {};
    return {
      id: don._id || String(index),
      donorName: don.donorName || 'Anonymous',
      amount: Number(don.amount) || 0,
      donationDate: don.createdAt || null,
      paddler: targetUser.name || 'General Fund',
      message: don.message || 'N/A',
      status: normalizeDonationStatus(don)
    };
  });

  // Apply date range and status filters
  const filtered = normalized.filter(row => {
    const dateOk = dateWithinRange(row.donationDate, fromDate, toDate);
    const statusOk = !status || status === 'all' || row.status === status;
    return dateOk && statusOk;
  });

  res.json(filtered);
});

// Get tax receipts (from donations or separate collection)
// GET /api/admin/finance/tax-receipts
const getFinanceTaxReceipts = asyncHandler(async (req, res) => {
  const { fromDate, toDate, status } = req.query;

  const donations = await Donation.find({ amount: { $gte: 10 } })
    .populate('targetUser', 'name email')
    .lean();

  // Normalize receipts
  const normalized = donations.map((don, index) => {
    // Generate a receipt number from donation ID
    const receiptNumber = `BTWV-${don._id?.toString()?.slice(-8)?.toUpperCase() || index}`;
    return {
      id: don._id || String(index),
      receiptNumber,
      donor: don.donorName || 'Anonymous',
      amount: Number(don.amount) || 0,
      issuedDate: don.createdAt || null,
      status: normalizeReceiptStatus({ status: 'not issued' }),
      donorEmail: don.donorEmail || 'N/A',
      donorPhone: don.donorPhone || 'N/A',
      donorAddress: don.donorAddress || 'N/A' 
    };
  });

  // Apply date range and status filters
  const filtered = normalized.filter(row => {
    const dateOk = dateWithinRange(row.issuedDate, fromDate, toDate);
    const statusOk = !status || status === 'all' || row.status === status;
    return dateOk && statusOk;
  });

  res.json(filtered);
});

// Add a cash donation
// POST /api/admin/finance/donations/cash
const addCashDonation = asyncHandler(async (req, res) => {
  const { amount, donorName, targetUserId, donationId, message } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Valid amount is required');
  }

  let targetUser = null;
  // Support finding the paddler by either donationId (public frontend identifier) or targetUserId (admin panel identifier)
  if (donationId) {
    targetUser = await User.findOne({ donationId });
    if (!targetUser) {
      res.status(404);
      throw new Error(`Paddler not found with donationId ${donationId}`);
    }
  } else if (targetUserId) {
    targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404);
      throw new Error(`Paddler not found with ID ${targetUserId}`);
    }
  }

  if (targetUser) {
    // Increment the paddler's total raised
    await User.updateOne(
      { _id: targetUser._id },
      { $inc: { amountRaised: amount } }
    );

    // If paddler has a team, increment the team's total raised
    if (targetUser.team) {
      await Team.updateOne(
        { _id: targetUser.team },
        { $inc: { totalRaised: amount } }
      );
    }
  }

  // Create fake unique Stripe strings to bypass database constraints safely
  const mockId = `cash_txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const donation = await Donation.create({
    stripePaymentIntentId: mockId,
    stripeCustomerId: `cash_cust_${Date.now()}`,
    stripeCheckoutSessionId: mockId,
    amount: amount,
    currency: 'CAD',
    status: 'completed',
    paymentMethod: 'cash',
    donorName: donorName || 'Anonymous Cash Donor',
    targetUser: targetUser ? targetUser._id : null,
    message: message || 'Let\'s go Brave the Waves!',
    isAnonymous: false
  });

  if (auditLog) {
    await auditLog({
      action: 'ADD_CASH_DONATION',
      adminId: req.auth?.payload?.sub,
      targetId: donation._id,
      details: `Added cash donation of $${amount} from ${donorName || 'Anonymous'} to ${targetUser ? targetUser.name : 'General'}`
    });
  }

  res.status(201).json({
    success: true,
    message: 'Cash donation recorded successfully',
    donation
  });
});

module.exports = {
  getAdminStats,
  getAllMembers,
  getMemberDetail,
  updateMember,
  updateMemberBio,
  deactivateMember,
  reactivateMember,
  deleteMember,
  getAdminTeams,
  createAdminTeam,
  updateAdminTeam,
  setAdminTeamCaptain,
  deleteAdminTeam,
  manageAdminTeamMembers,
  getFinanceRegistrations,
  getFinanceDonations,
  getFinanceTaxReceipts,
  addCashDonation
};
