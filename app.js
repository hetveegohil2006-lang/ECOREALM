const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import middlewares
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Import REST API routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const missionRoutes = require('./routes/missionRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const coachRoutes = require('./routes/coachRoutes');
const communityRoutes = require('./routes/communityRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const worldRoutes = require('./routes/worldRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const carbonRoutes = require('./routes/carbonRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection via Supabase (client initialized in lib/supabase)

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security & Utility Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for dev convenience with external scripts/ThreeJS/GSAP
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure session
const MemoryStore = require('memorystore')(session);

app.use(session({
  store: new MemoryStore({
    checkPeriod: 24 * 60 * 60 * 1000 // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || 'ecorealm-super-secret-key-12345',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Predefined Eco-Challenges (Session/EJS fallback)
const HABITS = {
  commute_green: { name: 'Commute Green (Walk/Bike/Transit)', xp: 50, coins: 25, carbon: 3.5, water: 0, energy: 0.8 },
  meatless_day: { name: 'Meatless Day (Plant-based meals)', xp: 40, coins: 20, carbon: 2.5, water: 150, energy: 0 },
  zero_waste: { name: 'Zero Waste Actions (Reusables)', xp: 30, coins: 15, carbon: 1.2, water: 20, energy: 0 },
  unplug_idle: { name: 'Unplug Idle Electronics', xp: 25, coins: 12, carbon: 0.8, water: 0, energy: 1.5 },
  plant_seedling: { name: 'Plant a Seedling or Tend Garden', xp: 60, coins: 30, carbon: 4.0, water: 10, energy: 0 },
  recycle_sort: { name: 'Sort and Recycle Waste Properly', xp: 20, coins: 10, carbon: 1.0, water: 5, energy: 0 }
};

// Predefined Store Upgrades (Session/EJS fallback)
const UPGRADES = {
  tree: { name: 'Lush Pine Tree', cost: 40, type: 'trees' },
  flower_patch: { name: 'Wildflower Patch', cost: 25, type: 'flowers' },
  clean_water: { name: 'Water Filtration Unit', cost: 50, type: 'waterCleanliness' },
  solar_panel: { name: 'Micro Solar Array', cost: 80, type: 'solarPanels' },
  wind_turbine: { name: 'Kinetic Wind Turbine', cost: 100, type: 'windTurbines' }
};

// AI Coach Conversational Mock Data (Session/EJS fallback)
const AI_RESPONSES = [
  "Fantastic action! Every step counts towards cooling the planet. Did you know that planting just one tree can absorb up to 22kg of CO2 per year?",
  "Wonderful choice! Bypassing meat for just one day saves as much water as showering for 2 hours straight. Keep it up!",
  "Great job unplugging! Standby power accounts for up to 10% of household electricity use. You are directly shrinking our grid footprint.",
  "Superb! Reusable bottles and bags keep microplastics out of our oceans. Your digital ecosystem's water is looking clearer already!",
  "Sorting waste properly keeps organic matter out of landfills, reducing methane emissions. You are a sorting superstar!",
  "A flourishing garden brings back native pollinators. Bees and butterflies in your EcoRealm thank you!"
];

// Helper to initialize session state
function initUserSession(req, username = 'Commander Eco') {
  req.session.user = {
    username: username,
    level: 1,
    xp: 0,
    coins: 100,
    carbonOffset: 0.0,
    waterSaved: 0.0,
    energyConserved: 0.0,
    rank: 'Seed Guardian',
    netZeroUnlocked: false,
    customTitleBought: false,
    island: {
      trees: 1,
      flowers: 1,
      waterCleanliness: 25, // percentage
      meadowGreenness: 25, // percentage
      solarPanels: 0,
      windTurbines: 0
    },
    history: []
  };
}

// Helper to update rank based on level
function checkRank(level) {
  if (level >= 50) return 'Planet Savior';
  if (level >= 30) return 'Earth Defender';
  if (level >= 20) return 'Climate Ranger';
  if (level >= 10) return 'Forest Protector';
  if (level >= 5) return 'Sprout Keeper';
  return 'Seed Guardian';
}

// Session-based Auth Middleware for EJS views (with Supabase session hydration)
const requireAuth = async (req, res, next) => {
  // If session is already loaded, proceed
  if (req.session && req.session.user) {
    return next();
  }

  // Fallback to JWT in cookie
  const token = req.cookies?.token;
  if (token) {
    try {
      const { supabase } = require('./lib/supabase');
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      
      if (authUser && !error) {
        // Hydrate session from Supabase profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          req.session.user = {
            _id: profile.id,
            username: profile.username,
            email: profile.email,
            level: profile.level || 1,
            xp: profile.xp || 0,
            coins: profile.eco_points !== undefined ? profile.eco_points : 100,
            carbonOffset: Number(profile.carbon_offset) || 0,
            waterSaved: Number(profile.water_saved) || 0,
            energyConserved: Number(profile.energy_conserved) || 0,
            rank: profile.guardian_rank || 'Seed Guardian',
            netZeroUnlocked: profile.net_zero_unlocked || false,
            customTitleBought: profile.custom_title_bought || false,
            scanCompleted: profile.scan_completed || false,
            island: profile.island || {
              trees: 1,
              flowers: 1,
              waterCleanliness: 25,
              meadowGreenness: 25,
              solarPanels: 0,
              windTurbines: 0
            },
            history: profile.history || []
          };
          return next();
        }
      }
    } catch (err) {
      console.warn('⚠️  Supabase Session hydration failed:', err.message);
    }
  }

  // Redirect to root route (which dynamically shows login EJS directly)
  res.redirect('/');
};

// Sync session state back to Supabase profiles table
const syncSessionToDb = async (req) => {
  if (!req.session?.user) return;
  const token = req.cookies?.token;
  if (token) {
    try {
      const { supabase } = require('./lib/supabase');
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      
      if (authUser) {
        await supabase
          .from('profiles')
          .update({
            level: req.session.user.level,
            xp: req.session.user.xp,
            eco_points: req.session.user.coins,
            carbon_offset: req.session.user.carbonOffset,
            water_saved: req.session.user.waterSaved,
            energy_conserved: req.session.user.energyConserved,
            guardian_rank: req.session.user.rank,
            net_zero_unlocked: req.session.user.netZeroUnlocked,
            custom_title_bought: req.session.user.customTitleBought,
            scan_completed: req.session.user.scanCompleted,
            island: req.session.user.island,
            history: req.session.user.history
          })
          .eq('id', authUser.id);
      }
    } catch (err) {
      console.warn('⚠️ Supabase sync failed:', err.message);
    }
  }
};

// ================= EJS FRONTEND ROUTES =================
app.get('/login', (req, res) => {
  res.redirect('/');
});

app.get('/register', (req, res) => {
  if (req.session?.user || req.cookies?.token) {
    return res.redirect('/');
  }
  res.render('register', { error: null });
});

app.post('/login', (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.render('login', { error: 'Please enter a valid command sign-in name.' });
  }
  initUserSession(req, username);
  res.redirect('/scan');
});

app.get('/logout', async (req, res) => {
  try {
    const { supabase } = require('./lib/supabase');
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('⚠️ Supabase signOut failed on logout:', err.message);
  }
  res.clearCookie('token');
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/scan', requireAuth, (req, res) => {
  if (req.session.user?.scanCompleted) {
    return res.redirect('/');
  }
  res.render('scan', { user: req.session.user });
});

app.get('/assessment', requireAuth, (req, res) => {
  res.redirect('/scan');
});

app.get('/diagnostic-scan', requireAuth, (req, res) => {
  res.redirect('/scan');
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.redirect('/');
});

app.get('/world', requireAuth, (req, res) => {
  res.redirect('/');
});

app.post('/api/save-scan', requireAuth, async (req, res) => {
  const { carbonScore, rating, classification } = req.body;
  const user = req.session.user;
  
  if (user) {
    user.rank = classification || 'Eco-Novice';
    user.startingCarbonScore = carbonScore || 16.0;
    user.scanCompleted = true;
    
    user.history.unshift({
      name: `Initialized profile as ${user.rank} (Carbon Score: ${user.startingCarbonScore}t)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      coins: 0,
      xp: 0
    });
    await syncSessionToDb(req);
  }
  res.json({ success: true });
});

app.get('/knowledge', requireAuth, (req, res) => {
  res.render('knowledge', { user: req.session.user });
});

app.post('/api/buy-xp', requireAuth, async (req, res) => {
  const user = req.session.user;
  const cost = 50;
  if (user.coins < cost) {
    return res.status(400).json({ error: 'Insufficient energy coins!' });
  }
  user.coins -= cost;
  user.xp += 100;
  
  const oldLevel = user.level;
  user.level = Math.floor(user.xp / 100) + 1;
  user.rank = checkRank(user.level);
  const leveledUp = user.level > oldLevel;
  
  user.history.unshift({
    name: 'Acquired 100 XP Command Booster',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    coins: -cost,
    xp: 100
  });
  await syncSessionToDb(req);
  res.json({
    success: true,
    user: user,
    leveledUp: leveledUp,
    message: 'Command XP Booster Activated! +100 XP.'
  });
});

app.post('/api/unlock-region', requireAuth, async (req, res) => {
  const user = req.session.user;
  const cost = 150;
  if (user.coins < cost) {
    return res.status(400).json({ error: 'Insufficient energy coins!' });
  }
  if (user.netZeroUnlocked) {
    return res.status(400).json({ error: 'Sector 6 (Net-Zero Future Hub) is already unlocked!' });
  }
  user.coins -= cost;
  user.netZeroUnlocked = true;
  
  user.history.unshift({
    name: 'Unlocked Sector 6 (Net-Zero Hub) Access',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    coins: -cost,
    xp: 0
  });
  await syncSessionToDb(req);
  res.json({
    success: true,
    user: user,
    message: 'Sector 6 Communication link ESTABLISHED.'
  });
});

app.post('/api/buy-title', requireAuth, async (req, res) => {
  const { title } = req.body;
  const user = req.session.user;
  const cost = 40;
  if (!title) {
    return res.status(400).json({ error: 'Title selection empty.' });
  }
  if (user.coins < cost) {
    return res.status(400).json({ error: 'Insufficient energy coins!' });
  }
  user.coins -= cost;
  user.rank = title; // Custom rank override
  user.customTitleBought = true;
  
  user.history.unshift({
    name: `Acquired Title: ${title}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    coins: -cost,
    xp: 0
  });
  await syncSessionToDb(req);
  res.json({
    success: true,
    user: user,
    message: `Title initialized as: ${title}`
  });
});

app.get('/', async (req, res) => {
  // If session is already loaded, proceed to dashboard or redirect to scan onboarding
  if (req.session && req.session.user) {
    if (!req.session.user.scanCompleted) {
      return res.redirect('/scan');
    }
    return res.render('dashboard', { 
      user: req.session.user,
      habits: HABITS,
      upgrades: UPGRADES
    });
  }

  // Fallback to JWT in cookie
  const token = req.cookies?.token;
  if (token) {
    try {
      const { supabase } = require('./lib/supabase');
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      
      if (authUser && !error) {
        // Hydrate session from Supabase profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          req.session.user = {
            _id: profile.id,
            username: profile.username,
            email: profile.email,
            level: profile.level || 1,
            xp: profile.xp || 0,
            coins: profile.eco_points !== undefined ? profile.eco_points : 100,
            carbonOffset: Number(profile.carbon_offset) || 0,
            waterSaved: Number(profile.water_saved) || 0,
            energyConserved: Number(profile.energy_conserved) || 0,
            rank: profile.guardian_rank || 'Seed Guardian',
            netZeroUnlocked: profile.net_zero_unlocked || false,
            customTitleBought: profile.custom_title_bought || false,
            scanCompleted: profile.scan_completed || false,
            island: profile.island || {
              trees: 1,
              flowers: 1,
              waterCleanliness: 25,
              meadowGreenness: 25,
              solarPanels: 0,
              windTurbines: 0
            },
            history: profile.history || []
          };
          
          if (!req.session.user.scanCompleted) {
            return res.redirect('/scan');
          }
          return res.render('dashboard', { 
            user: req.session.user,
            habits: HABITS,
            upgrades: UPGRADES
          });
        }
      }
    } catch (err) {
      console.warn('⚠️  JWT Session hydration failed:', err.message);
    }
  }

  // If not authenticated, render login page directly on the root URL
  res.render('login', { error: null });
});

app.post('/api/log-habit', requireAuth, async (req, res) => {
  const { habitId } = req.body;
  const habit = HABITS[habitId];

  if (!habit) {
    return res.status(400).json({ error: 'Unknown habit logged.' });
  }

  const user = req.session.user;
  
  user.xp += habit.xp;
  user.coins += habit.coins;
  user.carbonOffset += habit.carbon;
  user.waterSaved += habit.water;
  user.energyConserved += habit.energy;
  
  const oldLevel = user.level;
  user.level = Math.floor(user.xp / 100) + 1;
  user.rank = checkRank(user.level);

  let leveledUp = user.level > oldLevel;

  if (habitId === 'commute_green' || habitId === 'unplug_idle') {
    user.island.meadowGreenness = Math.min(100, user.island.meadowGreenness + 2);
  } else if (habitId === 'meatless_day' || habitId === 'zero_waste') {
    user.island.waterCleanliness = Math.min(100, user.island.waterCleanliness + 3);
  } else if (habitId === 'plant_seedling') {
    user.island.meadowGreenness = Math.min(100, user.island.meadowGreenness + 5);
  } else if (habitId === 'recycle_sort') {
    user.island.waterCleanliness = Math.min(100, user.island.waterCleanliness + 2);
  }

  user.history.unshift({
    name: habit.name,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    coins: habit.coins,
    xp: habit.xp
  });

  if (user.history.length > 10) user.history.pop();

  const commentIndex = Math.floor(Math.random() * AI_RESPONSES.length);
  const aiMessage = AI_RESPONSES[commentIndex];

  await syncSessionToDb(req);

  res.json({
    success: true,
    user: user,
    leveledUp: leveledUp,
    aiResponse: aiMessage,
    message: `Logged: "${habit.name}". +${habit.xp} XP, +${habit.coins} Coins!`
  });
});

app.post('/api/buy-upgrade', requireAuth, async (req, res) => {
  const { upgradeId } = req.body;
  const upgrade = UPGRADES[upgradeId];

  if (!upgrade) {
    return res.status(400).json({ error: 'Invalid item selected.' });
  }

  const user = req.session.user;

  if (user.coins < upgrade.cost) {
    return res.status(400).json({ error: 'Insufficient energy coins!' });
  }

  user.coins -= upgrade.cost;

  if (upgrade.type === 'waterCleanliness') {
    user.island.waterCleanliness = Math.min(100, user.island.waterCleanliness + 15);
  } else {
    user.island[upgrade.type] = (user.island[upgrade.type] || 0) + 1;
    user.island.meadowGreenness = Math.min(100, user.island.meadowGreenness + 4);
  }

  user.history.unshift({
    name: `Purchased ${upgrade.name}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    coins: -upgrade.cost,
    xp: 0
  });

  await syncSessionToDb(req);

  res.json({
    success: true,
    user: user,
    message: `Successfully deployed ${upgrade.name} to your EcoRealm!`
  });
});

app.post('/api/coach-chat', requireAuth, (req, res) => {
  const { message } = req.body;
  const user = req.session.user;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const msgLower = message.toLowerCase();
  let coachReply = "";

  if (msgLower.includes('hello') || msgLower.includes('hi')) {
    coachReply = `Hello ${user.username}! I am your AI Sustainability Coach. How is your restoration progress today? Try asking me about 'tips', 'carbon', or how to get more 'coins'!`;
  } else if (msgLower.includes('tip') || msgLower.includes('advice') || msgLower.includes('help')) {
    const tips = [
      "Try setting your thermostat 1°C lower in winter to shave 8% off your energy bill.",
      "Wash clothes in cold water! 90% of the energy consumed by washing machines goes towards heating water.",
      "Switch to LEDs. They consume 75% less energy and last 25 times longer than incandescent bulbs.",
      "Upgrading to public transport or carpooling is the single biggest individual carbon reduction action you can take!"
    ];
    coachReply = `Here is a restoration tip for you: ${tips[Math.floor(Math.random() * tips.length)]} Doing this will help us grow the trees in your digital EcoRealm faster.`;
  } else if (msgLower.includes('carbon') || msgLower.includes('co2')) {
    coachReply = `Currently, you have offset **${user.carbonOffset.toFixed(1)} kg of CO2** in this session! Your level ${user.level} rank (${user.rank}) makes you an active climate combatant. Let's aim to double that!`;
  } else if (msgLower.includes('coin') || msgLower.includes('store') || msgLower.includes('upgrade')) {
    coachReply = `You have **${user.coins} Energy Coins** remaining. Go to the Eco-Store to purchase Trees, Wildflowers, Solar Panels, or Wind Turbines. Unlocking them adds 3D visual assets directly onto your island and boosts your score!`;
  } else if (msgLower.includes('island') || msgLower.includes('realm') || msgLower.includes('3d')) {
    coachReply = `Your island currently has **${user.island.trees} trees**, **${user.island.flowers} wildflowers**, **${user.island.solarPanels} solar arrays**, and **${user.island.windTurbines} turbines**. Water cleanliness is at **${user.island.waterCleanliness}%**. Keep logging habits to restore it to 100%!`;
  } else {
    coachReply = `That is an interesting thought! Exploring new ways to protect our climate is key. As an AI coach, I recommend logging another eco-challenge like a "Meatless Day" or "Commuting Green" to see the direct visual impact on your floating island!`;
  }

  res.json({
    success: true,
    reply: coachReply
  });
});

app.post('/api/award-coins', requireAuth, async (req, res) => {
  const { coins, xp } = req.body;
  const user = req.session.user;

  if (typeof coins === 'number' && coins > 0) {
    user.coins += coins;
    
    user.history.unshift({
      name: `Won Arcade Challenge`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      coins: coins,
      xp: xp || 0
    });
  }

  if (typeof xp === 'number' && xp > 0) {
    user.xp += xp;
    
    const oldLevel = user.level;
    user.level = Math.floor(user.xp / 100) + 1;
    user.rank = checkRank(user.level);
    
    const leveledUp = user.level > oldLevel;
    
    await syncSessionToDb(req);

    res.json({
      success: true,
      user: user,
      leveledUp: leveledUp,
      message: `Arcade rewards added! +${coins} Coins, +${xp} XP.`
    });
    return;
  }

  await syncSessionToDb(req);

  res.json({
    success: true,
    user: user,
    leveledUp: false,
    message: `Arcade rewards added! +${coins} Coins.`
  });
});

// ================= JWT REST API ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/world', worldRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/carbon', carbonRoutes);

// Apply general API rate limiter to all API endpoints
app.use('/api', apiLimiter);

// Centralized Error Handler Middleware
app.use(errorHandler);

// Build HTTP Server wrapping Express App
const server = http.createServer(app);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 EcoRealm OS server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

module.exports = app;
