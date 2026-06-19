const AICoachSession = require('../models/AICoachSession');
const asyncHandler = require('../middleware/asyncHandler');
const { getCoachResponse, generateRecommendations } = require('../services/coachService');
const User = require('../models/User');

// @desc    Send a message to the AI Coach
// @route   POST /api/ai/chat
// @access  Private
exports.chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const user = await User.findById(req.user._id).select('-password');

  // Get or create coach session
  let session = await AICoachSession.findOne({ user: req.user._id });
  if (!session) session = new AICoachSession({ user: req.user._id, messages: [] });

  // Build history for OpenAI
  const history = session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

  const userContext = {
    username: user.username,
    level: user.level,
    rank: user.rank,
    carbonOffset: user.carbonOffset,
    coins: user.coins,
    island: user.island
  };

  let reply;
  if (process.env.OPENAI_API_KEY) {
    reply = await getCoachResponse(message, userContext, history);
  } else {
    // Fallback mock responses when OpenAI key not set
    const fallbacks = [
      `Hello ${user.username}! I'm ARIA, your AI Coach. Try asking me about carbon, tips, or your island!`,
      `Great question! Offsetting just 1kg of CO₂ today keeps your EcoREALM island thriving. Log a green habit now!`,
      `You're at Level ${user.level} — ${user.rank}. Keep earning XP through daily missions to evolve your Guardian avatar!`,
      `Did you know going meatless just once a week saves 450kg of CO₂ per year? That's real Guardian-level impact!`
    ];
    reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Persist messages
  session.messages.push({ role: 'user', content: message });
  session.messages.push({ role: 'assistant', content: reply });
  session.totalMessages += 2;
  session.lastActive = new Date();

  // Cap history at 100 messages
  if (session.messages.length > 100) session.messages = session.messages.slice(-100);
  await session.save();

  res.status(200).json({ success: true, reply, totalMessages: session.totalMessages });
});

// @desc    Get AI-powered personalized recommendations
// @route   POST /api/ai/recommendations
// @access  Private
exports.getRecommendations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  const DiagnosticResult = require('../models/DiagnosticResult');
  const latestScan = await DiagnosticResult.findOne({ user: req.user._id }).sort({ createdAt: -1 });

  let recommendations;
  if (process.env.OPENAI_API_KEY && latestScan) {
    const scaledScores = {};
    Object.keys(latestScan.scores).forEach(k => {
      scaledScores[k] = Math.min(10, Math.round((latestScan.scores[k] / 5) * 10));
    });
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
  const session = await AICoachSession.findOne({ user: req.user._id });
  if (!session) return res.status(200).json({ success: true, messages: [] });
  res.status(200).json({ success: true, messages: session.messages.slice(-50), total: session.totalMessages });
});

// @desc    Clear chat history
// @route   DELETE /api/ai/history
// @access  Private
exports.clearChatHistory = asyncHandler(async (req, res) => {
  await AICoachSession.findOneAndUpdate({ user: req.user._id }, { messages: [], totalMessages: 0, lastActive: new Date() });
  res.status(200).json({ success: true, message: 'Chat history cleared.' });
});
