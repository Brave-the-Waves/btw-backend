const User = require('../models/Users');
const Donation = require('../models/Donation');

const escapeCsvValue = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const getFundraisingLiveExport = async (req, res) => {
  try {
    const token = req.query.token;

    if (!token || token !== process.env.FUNDRAISING_EXPORT_TOKEN) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const participants = await User.aggregate([
      { $match: { role: 'paddler' } },
      {
        $lookup: {
          from: Donation.collection.name,
          localField: '_id',
          foreignField: 'targetUser',
          as: 'donations'
        }
      },
      {
        $addFields: {
          totalRaised: { $ifNull: [{ $sum: '$donations.amount' }, 0] },
          sortName: { $toLower: { $ifNull: ['$name', ''] } }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ['$name', ''] },
          email: { $ifNull: ['$email', ''] },
          totalRaised: 1
        }
      },
      { $sort: { sortName: 1, name: 1 } }
    ]);

    const csvRows = [
      ['Name', 'Email', 'Total Raised ($)'],
      ...participants.map((participant) => [
        participant.name,
        participant.email,
        Number(participant.totalRaised || 0).toFixed(2)
      ])
    ];

    const csv = csvRows
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Failed to generate fundraising export:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getFundraisingLiveExport
};