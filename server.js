const express = require('express');
const cors = require('cors');
const connectDB = require('./config/dbConnection');
require('dotenv').config();

connectDB();
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/registrations', require('./routes/registration'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));