require('dotenv').config();
const connectDB = require('../config/dbConnection');
const mongoose = require('mongoose');
const RegistrationCode = require('../models/RegistrationCode');

const seedCodes = async () => {
  await connectDB();

  const codes = [
    { code: 'H3pX9vL2qT7mZ8Kr', uses: 10, teamName: 'Brave the Waves Team' },
    { code: 'cK7vX3tR9qL2mZ8P', uses: 10, teamName: 'test' },
    { code: 'X7fQ9Lm2Rk8Vz4Tp', uses: 30, teamName: 'DBZ' },
    { code: 'nD4xK8qZ2Wm7Yt6R', uses: 30, teamName: 'DOD' },
    { code: 'P9vT3kL8xQ2rZ7Mn', uses: 30, teamName: 'CDBC' },
    { code: 'Z8mQ2rT7xL4pVk9W', uses: 30, teamName: 'CsBUM' }
  ];

  try {
    for (const entry of codes) {
      const existing = await RegistrationCode.findOne({ code: entry.code.toUpperCase() });
      if (existing) {
        console.log(`Skipping existing code: ${entry.code} (uses=${existing.uses})`);
        continue;
      }

      const created = await RegistrationCode.create({
        code: entry.code,
        uses: entry.uses,
        teamName: entry.teamName
      });
      console.log(`Inserted code: ${created.code} -> team: ${created.teamName} uses: ${created.uses}`);
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
