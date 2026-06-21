const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');
const { getCoachResponse, generateRecommendations } = require('../services/coachService');

// @desc    Send a message to the AI Coach
// @route   POST /api/ai/chat
// @access  Private
exports.chat = asyncHandler(async (req, res) => {
  const { message } = req.body;

  // Get user profile containing coach_history
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  const coachHistory = profile.coach_history || [];

  // Build history for OpenAI
  const history = coachHistory.slice(-10).map(m => ({ role: m.role, content: m.content }));

  const userContext = {
    username: profile.username,
    level: profile.level,
    rank: profile.guardian_rank,
    carbonOffset: Number(profile.carbon_offset) || 0,
    coins: profile.eco_points,
    island: profile.island
  };

  let reply;
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock_openai_key_since_using_fallback') {
    reply = await getCoachResponse(message, userContext, history);
  } else {
    // Fallback mock responses when OpenAI key not set
    const fallbacks = [
      `Hello ${profile.username}! I'm ARIA, your AI Coach. Try asking me about carbon, tips, or your island!`,
      `Great question! Offsetting just 1kg of CO₂ today keeps your EcoREALM island thriving. Log a green habit now!`,
      `You're at Level ${profile.level} — ${profile.guardian_rank}. Keep earning XP through daily missions to evolve your Guardian avatar!`,
      `Did you know going meatless just once a week saves 450kg of CO₂ per year? That's real Guardian-level impact!`
    ];
    reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Persist messages
  const newMessages = [...coachHistory, { role: 'user', content: message }, { role: 'assistant', content: reply }];

  // Cap history at 50 messages to keep DB payload light
  const cappedMessages = newMessages.slice(-50);

  await supabase
    .from('profiles')
    .update({ coach_history: cappedMessages })
    .eq('id', req.user.id);

  res.status(200).json({ success: true, reply, totalMessages: cappedMessages.length });
});

// @desc    Get AI-powered personalized recommendations
// @route   POST /api/ai/recommendations
// @access  Private
exports.getRecommendations = asyncHandler(async (req, res) => {
  const { data: latestScan } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let recommendations;
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock_openai_key_since_using_fallback' && latestScan) {
    const scaledScores = {
      transportation: Math.min(10, Math.round((latestScan.transportation / 5) * 10)),
      energy: Math.min(10, Math.round((latestScan.energy / 5) * 10)),
      food: Math.min(10, Math.round((latestScan.food / 5) * 10)),
      waste: Math.min(10, Math.round((latestScan.waste / 5) * 10)),
      water: Math.min(10, Math.round((latestScan.water / 5) * 10)),
      shopping: Math.min(10, Math.round((latestScan.shopping / 5) * 10))
    };
    recommendations = await generateRecommendations(scaledScores);
  } else {
    recommendations = [
      'Switch to public transport or cycling for your daily commute.',
      'Adopt a plant-rich diet — target at least 4 meatless days per week.',
      'Install smart power strips and LED bulbs to cut energy by 30%.',
      'Set up a home rainwater collector and reuse grey water for gardening.'
    ];
  }

  res.status(200).json({ success: true, recommendations });
});

// @desc    Get chat history
// @route   GET /api/ai/history
// @access  Private
exports.getChatHistory = asyncHandler(async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_history')
    .eq('id', req.user.id)
    .single();

  if (!profile || !profile.coach_history) {
    return res.status(200).json({ success: true, messages: [] });
  }

  res.status(200).json({ success: true, messages: profile.coach_history.slice(-50), total: profile.coach_history.length });
});

// @desc    Clear chat history
// @route   DELETE /api/ai/history
// @access  Private
exports.clearChatHistory = asyncHandler(async (req, res) => {
  await supabase
    .from('profiles')
    .update({ coach_history: [] })
    .eq('id', req.user.id);

  res.status(200).json({ success: true, message: 'Chat history cleared.' });
});
