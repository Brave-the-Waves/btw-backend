const admin = require('firebase-admin');
require('dotenv').config();

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
      const uid = decoded.uid || decoded.user_id || decoded.sub || decoded.email;
      req.auth = {
        payload: {
          sub: uid,
          email: decoded.email,
          name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : undefined),
        }
      };
      console.warn('Emulator auth: bypassed signature verification. Using token payload as authenticated user:', req.auth.payload.sub);
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Decoded Firebase token:', decodedToken);
    // Map to existing req.auth.payload structure for compatibility
    req.auth = {  
      payload: {
        sub: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split('@')[0],
      }
    };
    
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

module.exports = { 
  checkJwt,
  optionalCheckJwt 
};