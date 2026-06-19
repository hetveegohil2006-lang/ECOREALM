/**
 * EcoREALM XP & Level Calculation Utilities
 * Uses a progressive XP threshold: each level costs more XP than the last.
 * Formula: XP needed for level N = 100 * N * 1.2^(N-1)
 */

const BADGE_DEFINITIONS = [
  { id: 'recycling_hero',       name: 'Recycling Hero',        icon: '♻️',  condition: (u) => u.history?.filter(h => h.name?.includes('Recycle') || h.name?.includes('Sort')).length >= 5 },
  { id: 'water_warrior',        name: 'Water Warrior',         icon: '💧',  condition: (u) => u.waterSaved >= 500 },
  { id: 'energy_saver',         name: 'Energy Saver',          icon: '⚡',  condition: (u) => u.energyConserved >= 10 },
  { id: 'green_traveler',       name: 'Green Traveler',        icon: '🚲',  condition: (u) => u.history?.filter(h => h.name?.includes('Commute')).length >= 5 },
  { id: 'tree_guardian',        name: 'Tree Guardian',         icon: '🌳',  condition: (u) => (u.island?.trees || 0) >= 5 },
  { id: 'ocean_protector',      name: 'Ocean Protector',       icon: '🌊',  condition: (u) => u.history?.filter(h => h.name?.includes('Zero Waste') || h.name?.includes('Reusable')).length >= 3 },
  { id: 'wildlife_defender',    name: 'Wildlife Defender',     icon: '🦋',  condition: (u) => u.level >= 10 },
  { id: 'climate_champion',     name: 'Climate Champion',      icon: '🏆',  condition: (u) => u.carbonOffset >= 50 },
  { id: 'sustainability_master',name: 'Sustainability Master', icon: '🌍',  condition: (u) => u.level >= 20 },
  { id: 'planet_savior',        name: 'Planet Savior',         icon: '🌟',  condition: (u) => u.level >= 50 }
];

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_mission',   name: 'First Steps',            description: 'Complete your first eco-mission.',           icon: '🌱', condition: (u) => (u.history?.length || 0) >= 1 },
  { id: 'co2_10',          name: 'Carbon Crusader',        description: 'Offset 10 kg of CO₂.',                       icon: '☁️', condition: (u) => u.carbonOffset >= 10 },
  { id: 'co2_100',         name: 'Carbon Slayer',          description: 'Offset 100 kg of CO₂.',                      icon: '🌪️', condition: (u) => u.carbonOffset >= 100 },
  { id: 'level_5',         name: 'Sprout Rising',          description: 'Reach Level 5 — Sprout Keeper.',             icon: '🌿', condition: (u) => u.level >= 5 },
  { id: 'level_10',        name: 'Forest Born',            description: 'Reach Level 10 — Forest Protector.',         icon: '🌲', condition: (u) => u.level >= 10 },
  { id: 'level_20',        name: 'Ranger Protocol',        description: 'Reach Level 20 — Climate Ranger.',           icon: '⚔️', condition: (u) => u.level >= 20 },
  { id: 'level_30',        name: 'Earth\'s Shield',        description: 'Reach Level 30 — Earth Defender.',           icon: '🛡️', condition: (u) => u.level >= 30 },
  { id: 'level_50',        name: 'Planetary Legend',       description: 'Reach Level 50 — Planet Savior.',            icon: '🌟', condition: (u) => u.level >= 50 },
  { id: 'coins_500',       name: 'Eco Banker',             description: 'Accumulate 500 Eco Coins.',                  icon: '💰', condition: (u) => u.coins >= 500 },
  { id: 'all_badges',      name: 'Badge Collector',        description: 'Earn all 10 Guardian Badges.',               icon: '🎖️', condition: (u) => (u.badges?.length || 0) >= 10 }
];

/**
 * Calculate level from total XP using progressive thresholds
 * @param {number} xp
 * @returns {number} level
 */
const getLevelFromXP = (xp) => {
  let level = 1;
  let required = 0;
  while (true) {
    required += Math.floor(100 * level * Math.pow(1.2, level - 1));
    if (xp < required) break;
    level++;
  }
  return level;
};

/**
 * Get XP required to reach next level
 * @param {number} currentLevel
 * @returns {number} xp needed
 */
const getXPForNextLevel = (currentLevel) => {
  return Math.floor(100 * currentLevel * Math.pow(1.2, currentLevel - 1));
};

/**
 * Get Guardian rank from level
 * @param {number} level
 * @returns {string}
 */
const getRankFromLevel = (level) => {
  if (level >= 50) return 'Planet Savior';
  if (level >= 30) return 'Earth Defender';
  if (level >= 20) return 'Climate Ranger';
  if (level >= 10) return 'Forest Protector';
  if (level >= 5)  return 'Sprout Keeper';
  return 'Seed Guardian';
};

/**
 * Get avatar tier string from level
 * @param {number} level
 * @returns {string}
 */
const getAvatarTier = (level) => {
  if (level >= 50) return 'planet_savior';
  if (level >= 30) return 'earth_defender';
  if (level >= 20) return 'climate_ranger';
  if (level >= 10) return 'forest_protector';
  if (level >= 5)  return 'sprout_keeper';
  return 'seed_guardian';
};

/**
 * Check which new badges a user should receive
 * @param {Object} user - plain user object
 * @param {string[]} existingBadgeIds
 * @returns {Array} new badges earned
 */
const checkBadges = (user, existingBadgeIds = []) => {
  return BADGE_DEFINITIONS.filter(
    (b) => !existingBadgeIds.includes(b.id) && b.condition(user)
  ).map(({ id, name, icon }) => ({ id, name, icon, earnedAt: new Date() }));
};

/**
 * Check which new achievements a user should receive
 * @param {Object} user - plain user object
 * @param {string[]} existingAchievementIds
 * @returns {Array} new achievements earned
 */
const checkAchievements = (user, existingAchievementIds = []) => {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (a) => !existingAchievementIds.includes(a.id) && a.condition(user)
  ).map(({ id, name, description, icon }) => ({ id, name, description, icon, earnedAt: new Date() }));
};

module.exports = {
  getLevelFromXP,
  getXPForNextLevel,
  getRankFromLevel,
  getAvatarTier,
  checkBadges,
  checkAchievements,
  BADGE_DEFINITIONS,
  ACHIEVEMENT_DEFINITIONS
};
