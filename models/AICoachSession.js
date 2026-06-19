const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const AICoachSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [ChatMessageSchema],
  totalMessages: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

AICoachSessionSchema.index({ user: 1 });

module.exports = mongoose.model('AICoachSession', AICoachSessionSchema);
