require('dotenv').config();
const connectDB = require('../config/dbConnection');
const mongoose = require('mongoose');
const RegistrationCode = require('../models/RegistrationCode');

const seedCodes = async () => {
  await connectDB();

  const codes = [
    { code: 'R8mZ2qL7vX4TpK9n', uses: 30, teamName: 'Brave the Waves Organizing Team' },
    { code: 'cK7vX3tR9qL2mZ8P', uses: 10, teamName: 'test' },
    { code: 'X7fQ9Lm2Rk8Vz4Tp', uses: 30, teamName: 'DBZ' },
    { code: 'nD4xK8qZ2Wm7Yt6R', uses: 30, teamName: 'DOD' },
    { code: 'P9vT3kL8xQ2rZ7Mn', uses: 30, teamName: 'CDBC' },
    { code: 'Z8mQ2rT7xL4pVk9W', uses: 30, teamName: 'CsBUM' }
  ];

  try {
    for (const entry of codes) {
      const updated = await RegistrationCode.findOneAndUpdate(
        { code: entry.code.toUpperCase() },
        {
          $set: {
            uses: entry.uses,
            teamName: entry.teamName
          },
          $setOnInsert: {
            code: entry.code.toUpperCase()
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`Upserted code: ${updated.code} -> team: ${updated.teamName} uses: ${updated.uses}`);
    }
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from DB');
    process.exit(0);
  }
};

seedCodes();
