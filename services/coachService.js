const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// EcoREALM system persona
const SYSTEM_PROMPT = `You are ARIA — the AI Restoration Intelligence Assistant embedded in EcoREALM, 
a gamified environmental awareness platform. You speak in a supportive, inspiring, and slightly futuristic tone.
You help Guardian players understand their carbon footprint, give actionable sustainability tips, 
celebrate their eco-achievements, and guide them through EcoREALM's missions and challenges.
Always keep responses concise (2–4 sentences max), energetic, and focused on real environmental impact.
Occasionally reference EcoREALM mechanics like XP, Eco Coins, Guardian rank, and the 3D island.`;

/**
 * Get an AI Coach response from OpenAI
 * @param {string} userMessage - The user's message
 * @param {Object} userContext - { username, level, rank, carbonOffset, coins, island }
 * @param {Array}  history     - Previous messages [{ role, content }]
 * @returns {string} AI reply
 */
const getCoachResponse = async (userMessage, userContext = {}, history = []) => {
  const contextBlock = userContext.username
    ? `Guardian Profile: ${userContext.username} | Level ${userContext.level} ${userContext.rank} | ${userContext.carbonOffset?.toFixed(1)}kg CO₂ offset | ${userContext.coins} Eco Coins.`
    : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + (contextBlock ? `\n\nCurrent Guardian Context: ${contextBlock}` : '') },
    ...history.slice(-6), // last 6 turns for context window efficiency
    { role: 'user', content: userMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 200,
    temperature: 0.75
  });

  return completion.choices[0].message.content.trim();
};

/**
 * Generate personalized sustainability recommendations based on diagnostic data
 * @param {Object} diagnosticData - Category scores from the diagnostic scan
 * @returns {string[]} Array of recommendation strings
 */
const generateRecommendations = async (diagnosticData) => {
  const prompt = `Based on this environmental diagnostic profile:
- Transportation: ${diagnosticData.transportation} (scale 1-10, 10=worst)
- Energy: ${diagnosticData.energy}
- Food: ${diagnosticData.food}
- Waste: ${diagnosticData.waste}
- Water: ${diagnosticData.water}
- Shopping: ${diagnosticData.shopping}

Generate exactly 4 specific, actionable sustainability recommendations as a JSON array of strings. 
Start each with a strong action verb. Be concise and measurable.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an environmental data analyst. Respond with only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 300,
    temperature: 0.6,
    response_format: { type: 'json_object' }
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content);
    return parsed.recommendations || parsed.items || [];
  } catch {
    return [
      'Switch to public transport or cycling for daily commutes.',
      'Reduce meat consumption to 3 days per week.',
      'Install LED lighting and unplug idle electronics.',
      'Start a home composting system to reduce landfill waste.'
    ];
  }
};

module.exports = { getCoachResponse, generateRecommendations };
