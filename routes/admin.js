const express = require('express');
const router = express.Router();
const { checkJwt, requireAdmin } = require('../middleware/auth');
const { 
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
  addCashDonation,
  updateDonationTarget,
  deleteCashDonation
} = require('../controllers/adminController');


// All admin routes require authentication AND admin status
router.use(checkJwt, requireAdmin);

// Get admin dashboard statistics
// GET /api/admin/stats
router.get('/stats', getAdminStats);

// Get all members (with filters)
// GET /api/admin/members
router.get('/members', getAllMembers);
router.get('/members/:id', getMemberDetail);
router.patch('/members/:id', updateMember);
router.patch('/members/:id/bio', updateMemberBio);
router.patch('/members/:id/deactivate', deactivateMember);
router.patch('/members/:id/reactivate', reactivateMember);
router.delete('/members/:id', deleteMember);

// Get all teams
// GET /api/admin/teams
router.get('/teams', getAdminTeams);
router.post('/teams', createAdminTeam);
router.patch('/teams/:id', updateAdminTeam);
router.patch('/teams/:id/captain', setAdminTeamCaptain);
router.delete('/teams/:id', deleteAdminTeam);
router.patch('/teams/:id/members', manageAdminTeamMembers);

// Get finance data
// GET /api/admin/finance/registrations
router.get('/finance/registrations', getFinanceRegistrations);

// GET /api/admin/finance/donations
router.get('/finance/donations', getFinanceDonations);

// POST /api/admin/finance/donations/cash
router.post('/finance/donations/cash', addCashDonation);

// PUT /api/admin/finance/donations/:id
router.put('/finance/donations/:id', updateDonationTarget);

// DELETE /api/admin/finance/donations/:id
router.delete('/finance/donations/:id', deleteCashDonation);

// GET /api/admin/finance/tax-receipts
router.get('/finance/tax-receipts', getFinanceTaxReceipts);

module.exports = router;