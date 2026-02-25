require('dotenv').config();
const connectDB = require('../config/dbConnection');
const mongoose = require('mongoose');
const RegistrationCode = require('../models/RegistrationCode');

const seedCodes = async () => {
  await connectDB();

  const codes = [
    { code: 'ALPHA2026', uses: 10, teamName: 'Alpha Team' },
    { code: 'BRAVE2026', uses: 10, teamName: 'Brave Team' },
    { code: 'WAVES2026', uses: 10, teamName: 'Waves Team' },
    { code: 'TEAM2026', uses: 10, teamName: 'Team 2026' }
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
