require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Initialize MongoDB connection if URI is provided
  if (process.env.MONGO_URI) {
    if (mongoose.connection.readyState === 0) {
      mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.error('MongoDB connection error:', err));
    }
  } else {
    console.warn('MONGO_URI not set — skipping MongoDB connection');
  }

  const userSchema = new mongoose.Schema({
    userId: String,
    lastSpin: Number
  });

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const prizes = [
    { name: '10% OFF', weight: 40 },
    { name: 'Premium 24h', weight: 20 },
    { name: 'Free Content', weight: 15 },
    { name: 'Jackpot', weight: 5 },
    { name: 'Nothing', weight: 20 }
  ];

  function weightedRandom() {
    const total = prizes.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * total;

    for (let p of prizes) {
      if (rand < p.weight) return p.name;
      rand -= p.weight;
    }
    return prizes[prizes.length - 1].name;
  }

  app.post('/spin', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) return res.json({ error: 'No userId' });

      const now = Date.now();
      const user = await User.findOne({ userId });

      if (user && now - user.lastSpin < 86400000) {
        return res.json({ error: 'Spin available in 24h' });
      }

      const prize = weightedRandom();

      await User.findOneAndUpdate(
        { userId },
        { lastSpin: now },
        { upsert: true }
      );

      res.json({ prize });
    } catch (err) {
      console.error('Error in /spin:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = createApp;