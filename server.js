require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  if (process.env.MONGO_URI && mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGO_URI)
      .then(() => console.log("MongoDB connected"))
      .catch(err => console.log(err));
  } else if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set — skipping MongoDB connection");
  }

  const userSchema = new mongoose.Schema({
    userId: String,
    lastSpin: Number
  });

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const prizes = [
    { name: "10% OFF", weight: 40 },
    { name: "Premium 24h", weight: 20 },
    { name: "Free Content", weight: 15 },
    { name: "Jackpot", weight: 5 },
    { name: "Nothing", weight: 20 }
  ];

  function weightedRandom() {
    const total = prizes.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * total;

    for (let p of prizes) {
      if (rand < p.weight) return p.name;
      rand -= p.weight;
    }
  }

  app.post('/spin', async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.json({ error: "No userId" });

    const now = Date.now();
    const user = await User.findOne({ userId });

    if (user && now - user.lastSpin < 86400000) {
      return res.json({ error: "Spin available in 24h" });
    }

    const prize = weightedRandom();

    await User.findOneAndUpdate(
      { userId },
      { lastSpin: now },
      { upsert: true }
    );

    res.json({ prize });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("Server działa na porcie", PORT);
  });
}

module.exports = { createApp };