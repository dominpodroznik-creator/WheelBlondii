require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname))); // Serwuj pliki statyczne

  // Obsługę HTML na GET /
  app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.sendFile(path.join(__dirname, 'indeks.html'));
  });

  // Rate limiter - zabezpieczenie przed spamem
  const requestLog = new Map(); // { userId: timestamp }
  const REQUEST_COOLDOWN = 2000; // 2 sekundy między requestami

  function isRateLimited(userId) {
    const now = Date.now();
    const lastRequest = requestLog.get(userId);
    
    if (lastRequest && now - lastRequest < REQUEST_COOLDOWN) {
      return true; // User spam'uje
    }
    
    requestLog.set(userId, now);
    
    // Cleanup: usuń stare wpisy (starsze niż 1 hora)
    if (requestLog.size > 10000) {
      for (let [key, time] of requestLog) {
        if (now - time > 3600000) requestLog.delete(key);
      }
    }
    
    return false;
  }

  // Initialize MongoDB connection if URI is provided
  if (process.env.MONGO_URI) {
    if (mongoose.connection.readyState === 0) {
      mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.error('MongoDB connection error:', err));
    }
  } else {
    console.warn('MONGO_URI not set — using in-memory storage for testing');
  }

  // In-memory user storage (fallback gdy brak MongoDB)
  const userStorage = new Map(); // { userId: { lastSpin: timestamp } }

  // Funkcja do pobrania użytkownika (MongoDB lub in-memory)
  async function findUser(userId) {
    if (process.env.MONGO_URI) {
      try {
        return await User.findOne({ userId });
      } catch (err) {
        console.error('MongoDB findOne error:', err);
        return null;
      }
    }
    return userStorage.get(userId) || null;
  }

  // Funkcja do zapisania/updatu użytkownika
  async function updateUser(userId, lastSpin) {
    if (process.env.MONGO_URI) {
      try {
        return await User.findOneAndUpdate(
          { userId },
          { lastSpin },
          { upsert: true }
        );
      } catch (err) {
        console.error('MongoDB update error:', err);
      }
    }
    userStorage.set(userId, { lastSpin });
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

      // Sprawdź rate limiting
      if (isRateLimited(userId)) {
        console.warn('Rate limit hit for user:', userId);
        return res.status(429).json({ error: 'Too many requests - wait 2 seconds' });
      }

      const now = Date.now();
      const user = await findUser(userId);

      if (user && now - user.lastSpin < 86400000) {
        return res.json({ error: 'Spin available in 24h' });
      }

      const prize = weightedRandom();
      
      // Validacja - upewnij się że prize jest z listy
      const validPrizes = prizes.map(p => p.name);
      if (!validPrizes.includes(prize)) {
        console.error('Invalid prize:', prize);
        return res.status(500).json({ error: 'Server error' });
      }

      await updateUser(userId, now);

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