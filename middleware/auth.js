const { auth } = require('express-oauth2-jwt-bearer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// MOCK AUTH FOR LOCAL TESTING
// Validates JWT tokens signed with AUTH0_SECRET (HS256)
const mockCheckJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[MOCK] No token provided');
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.AUTH0_SECRET, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
      algorithms: ['HS256']
    });

    console.log('[MOCK] Token decoded successfully:', decoded);

    req.auth = { payload: decoded };
    console.log('[MOCK] Token verified for user:', decoded.sub);
    next();
  } catch (err) {
    console.error('[MOCK] Token Verification Failed:', err.message);
    return res.status(401).json({ error: err.message });
  }
};

// PRODUCTION AUTH0 (RS256)
// This middleware checks if the incoming request has a valid Auth0 Token
const checkJwt = (req, res, next) => {
  const jwtCheck = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
  });

  jwtCheck(req, res, (err) => {
    if (err) {
      console.error('Auth0 Token Verification Failed:', err.message);
      console.error('Expected Audience:', process.env.AUTH0_AUDIENCE);
      console.error('Expected Issuer:', process.env.AUTH0_ISSUER_BASE_URL);
      return res.status(err.status || 401).json({ error: err.message });
    }
    next();
  });
};

const optionalCheckJwt = (req, res, next) => {
  if (!req.headers.authorization) {
    return next();
  }
  checkJwt(req, res, next);
};

// Export mock or real based on environment variable
const activeCheckJwt = process.env.USE_MOCK_AUTH === 'true' ? mockCheckJwt : checkJwt;

module.exports = { 
  checkJwt: activeCheckJwt,
  optionalCheckJwt 
};