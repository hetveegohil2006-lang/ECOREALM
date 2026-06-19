const CommunityPost = require('../models/CommunityPost');
const asyncHandler = require('../middleware/asyncHandler');
const { emitNewPost } = require('../services/socketService');

// @desc    Create a post
// @route   POST /api/community/post
// @access  Private
exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, category, tags } = req.body;
  const media = req.files ? req.files.map(f => f.path) : [];

  const post = await CommunityPost.create({
    author: req.user._id,
    title,
    content,
    category: category || 'general',
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    media
  });

  const populated = await post.populate('author', 'username avatar rank level');

  try { emitNewPost(populated); } catch {}

  res.status(201).json({ success: true, message: 'Post published to the Guardian Community!', post: populated });
});

// @desc    Get community feed
// @route   GET /api/community/feed
// @access  Private
exports.getFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { category, search } = req.query;

  const filter = { isVisible: true };
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const posts = await CommunityPost.find(filter)
    .populate('author', 'username avatar rank level')
    .sort({ isPinned: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await CommunityPost.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: posts.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    posts
  });
});

// @desc    Get single post
// @route   GET /api/community/post/:id
// @access  Private
exports.getPost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate('author', 'username avatar rank level');

  if (!post || !post.isVisible) return res.status(404).json({ success: false, error: 'Post not found.' });
  res.status(200).json({ success: true, post });
});

// @desc    Like / Unlike a post
// @route   PUT /api/community/post/:id/like
// @access  Private
exports.likePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found.' });

  const alreadyLiked = post.likes.includes(req.user._id);
  if (alreadyLiked) {
    post.likes.pull(req.user._id);
  } else {
    post.likes.push(req.user._id);
  }
  await post.save();

  res.status(200).json({ success: true, liked: !alreadyLiked, likeCount: post.likes.length });
});

// @desc    Add a comment
// @route   POST /api/community/comment/:postId
// @access  Private
exports.addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, error: 'Comment cannot be empty.' });

  const post = await CommunityPost.findById(req.params.postId);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found.' });

  post.comments.push({ author: req.user._id, content: content.trim() });
  await post.save();

  const updated = await CommunityPost.findById(req.params.postId).populate('author', 'username avatar');
  res.status(201).json({ success: true, message: 'Comment posted.', comments: updated.comments });
});

// @desc    Delete own post
// @route   DELETE /api/community/post/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Post not found.' });
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized to delete this post.' });
  }
  post.isVisible = false;
  await post.save();
  res.status(200).json({ success: true, message: 'Post removed.' });
});
