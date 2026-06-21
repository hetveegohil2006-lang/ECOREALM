const { supabase } = require('../lib/supabase');

// Protect routes — requires valid JWT Bearer token from Supabase
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token || token === 'none') {
    return res.status(401).json({ success: false, error: 'Not authorized — no token provided.' });
  }

  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !authUser) {
      return res.status(401).json({ success: false, error: 'Token is invalid or expired.' });
    }

    // Fetch profile data from public.profiles table
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileErr || !profile) {
      return res.status(401).json({ success: false, error: 'User profile not found.' });
    }

    // Map to compat object for controllers expecting req.user
    req.user = {
      _id: profile.id, // For backward compatibility with Mongo ObjectIds
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
      level: profile.level,
      xp: profile.xp,
      coins: profile.eco_points,
      ecoPoints: profile.eco_points,
      carbonOffset: Number(profile.carbon_offset) || 0,
      waterSaved: Number(profile.water_saved) || 0,
      energyConserved: Number(profile.energy_conserved) || 0,
      rank: profile.guardian_rank,
      netZeroUnlocked: profile.net_zero_unlocked,
      customTitleBought: profile.custom_title_bought,
      scanCompleted: profile.scan_completed,
      island: profile.island,
      history: profile.history
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token is invalid or expired.' });
  }
};

// Session-based auth guard (for EJS views)
const requireSession = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user?.role}' is not authorized.`
      });
    }
    next();
  };
};

module.exports = { protect, requireSession, authorize };
