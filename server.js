const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/dbConnection');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

connectDB();
const app = express();
console.log("Database connected successfully.");
// DEBUG LOGGER: Print every request hitting the server
app.use((req, res, next) => {
  console.log("-------------------------------");
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log("-------------------------------");
  next();
});

app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250, // Limit each IP to 250 requests per windowsMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stripe webhook route MUST come before express.json() middleware
// because Stripe needs the raw body to verify signatures
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), require('./controllers/paymentController').stripeWebhook);

// Apply the rate limiting middleware to all requests
app.use(limiter);

// Now apply JSON parsing for all other routes
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/registrations', require('./routes/registration'));
app.use('/api/public/teams', require('./routes/teams'));
app.use('/api/teams', require('./routes/teamManagement'));
app.use('/api', require('./routes/payment'));
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));