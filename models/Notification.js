const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: ['mission', 'challenge', 'badge', 'levelup', 'friend_request', 'friend_accept', 'community_like', 'community_comment', 'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  icon: { type: String, default: '🌱' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
