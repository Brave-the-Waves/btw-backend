const admin = require('firebase-admin');
require('dotenv').config();

// Parse ADMIN_EMAILS from env into a Set for O(1) lookup
// Example: ADMIN_EMAILS=alice@example.com,bob@example.com,charlie@example.com
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
);

console.log(`Loaded ${ADMIN_EMAILS.size} admin emails from ADMIN_EMAILS env`);

// Helper: Check if user email qualifies as admin
// First checks persisted DB flag (if available), falls back to env allowlist
function isAdminEmail(email) {
  if (!email) return false;
  
  // Primary: check env allowlist
  return ADMIN_EMAILS.has(email.toLowerCase());
}

// Read auth mode from env: 'production' (default) or 'emulator'
const FIREBASE_AUTH_MODE = (process.env.FIREBASE_AUTH_MODE || 'production').toLowerCase();

// Initialize Firebase Admin SDK only in non-emulator (production) mode or when credentials are present
if (FIREBASE_AUTH_MODE !== 'emulator') {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('Firebase Admin SDK initialized');
  }
} else {
  console.warn('FIREBASE_AUTH_MODE=emulator — skipping firebase-admin credential initialization and allowing unsigned tokens for testing');
}

// Firebase JWT verification middleware
// Helper: decode JWT payload without verifying signature (safe only in emulator/testing)
const decodeJwtWithoutVerification = (token) => {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT format');
  const payloadB64 = parts[1];
  // base64url -> base64
  let b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
};

// Helper: Check if user account is disabled
// Called after JWT is verified to prevent disabled users from accessing the API
const checkAccountStatus = async (uid) => {
  try {
    const User = require('../models/Users');
    const user = await User.findById(uid).select('accountStatus');
    
    if (!user) {
      return true; 
    }
    
    if (user.accountStatus === 'disabled') {
      return false; 
    }
    
    return true;
  } catch (err) {
    console.error('Error checking account status:', err.message);
    return true; 
  }
};

const checkJwt = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No authorization token provided');
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);

  try {
    if (FIREBASE_AUTH_MODE === 'emulator') {
      // In emulator mode the emulator issues unsigned tokens for convenience.
      // Decode without verifying signature — only allowed for local testing.
      const decoded = decodeJwtWithoutVerification(token);
      const uid = decoded.user_id || decoded.sub
      req.auth = {
        payload: {
          sub: uid,
          email: decoded.email,
          name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : undefined),
        }
      };
      req.auth.isAdmin = isAdminEmail(req.auth.payload.email);

      // Check if account is disabled
      const isActive = await checkAccountStatus(req.auth.payload.sub);
      if (!isActive) {
        console.warn(`Access denied for disabled account: ${req.auth.payload.sub}`);
        return res.status(401).json({ error: 'Account has been disabled' });
      }

      console.warn(`[SECURITY] Emulator mode active: bypassed signature verification for user ${req.auth.payload.sub}`);
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    // Map to existing req.auth.payload structure for compatibility
    req.auth = {  
      payload: {
        sub: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split('@')[0],
      }
    };

    req.auth.isAdmin = isAdminEmail(req.auth.payload.email);

    // Check if account is disabled
    const isActive = await checkAccountStatus(req.auth.payload.sub);
    if (!isActive) {
      console.warn(`Access denied for disabled account: ${req.auth.payload.sub}`);
      return res.status(401).json({ error: 'Account has been disabled' });
    }
    
    console.log('Firebase token verified for user:', decodedToken.uid);
    next();
  } catch (err) {
    console.error('Firebase Token Verification Failed:', err.message);
    return res.status(401).json({ error: err.message });
  }
};

const optionalCheckJwt = async (req, res, next) => {
  if (!req.headers.authorization) {
    return next();
  }
  await checkJwt(req, res, next);
};

// Middleware to enforce admin access
const requireAdmin = (req, res, next) => {
  if (!req.auth?.isAdmin) {
    console.warn(`Admin access denied for user: ${req.auth?.payload?.email}`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log(`Admin access granted for user: ${req.auth.payload.email}`);
  next();
}

module.exports = { 
  checkJwt,
  optionalCheckJwt,
  requireAdmin,
  isAdminEmail
};