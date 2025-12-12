const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config();

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

module.exports = { checkJwt, optionalCheckJwt };