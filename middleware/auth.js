const { auth } = require('express-oauth2-jwt-bearer');

// This middleware checks if the incoming request has a valid Auth0 Token
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE, // e.g., 'https://api.bravethewaves.org'
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL, // e.g., 'https://dev-xyz.us.auth0.com/'
  tokenSigningAlg: 'RS256'
});

module.exports = checkJwt;