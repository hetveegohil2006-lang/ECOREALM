const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CommunityPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['tips', 'achievement', 'challenge', 'discussion', 'news', 'general'],
    default: 'general'
  },
  tags: [{ type: String, trim: true }],
  media: [{ type: String }],                    // URLs to images/videos
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  views: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isReported: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Text index for search
CommunityPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
