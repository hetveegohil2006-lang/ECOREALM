/**
 * EcoREALM Socket.IO Service
 * Handles real-time events: leaderboard updates, community notifications,
 * live habit completions, and Guardian level-up broadcasts.
 */

let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join a user's personal room for targeted events
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`   → User ${userId} joined their room`);
    });

    // Join community room for live post feed
    socket.on('join:community', () => {
      socket.join('community');
    });

    // Join global leaderboard room
    socket.on('join:leaderboard', () => {
      socket.join('leaderboard');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized. Call initSocket(server) first.');
  return io;
};

// --- Emitters ---

/** Broadcast a leaderboard update to all clients in the leaderboard room */
const emitLeaderboardUpdate = (leaderboardData) => {
  getIO().to('leaderboard').emit('leaderboard:update', leaderboardData);
};

/** Notify a specific user of a level-up event */
const emitLevelUp = (userId, data) => {
  getIO().to(`user:${userId}`).emit('guardian:levelup', data);
};

/** Broadcast a new community post to the community room */
const emitNewPost = (post) => {
  getIO().to('community').emit('community:new_post', post);
};

/** Notify a user they earned a badge */
const emitBadgeEarned = (userId, badge) => {
  getIO().to(`user:${userId}`).emit('guardian:badge_earned', badge);
};

/** Broadcast a global challenge completion */
const emitChallengeCompleted = (challengeData) => {
  getIO().emit('challenge:completed', challengeData);
};

module.exports = {
  initSocket,
  getIO,
  emitLeaderboardUpdate,
  emitLevelUp,
  emitNewPost,
  emitBadgeEarned,
  emitChallengeCompleted
};
