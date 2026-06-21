const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');

// Map database post with profile join to frontend expected JSON structure
const formatPost = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    title: p.title,
    content: p.content,
    category: p.category || 'general',
    likes: p.likes || [],
    comments: p.comments || [],
    createdAt: p.created_at,
    author: p.author ? {
      _id: p.author.id,
      id: p.author.id,
      username: p.author.username,
      avatar: p.author.avatar,
      rank: p.author.guardian_rank,
      level: p.author.level
    } : null
  };
};

// @desc    Create a post
// @route   POST /api/community/post
// @access  Private
exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, category, tags } = req.body;

  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: req.user.id,
      title,
      content,
      category: category || 'general',
      likes: [],
      comments: []
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Populate author profile details
  const { data: populated } = await supabase
    .from('community_posts')
    .select('*, author:profiles(*)')
    .eq('id', post.id)
    .single();

  const formatted = formatPost(populated);

  res.status(201).json({ success: true, message: 'Post published to the Guardian Community!', post: formatted });
});

// @desc    Get community feed
// @route   GET /api/community/feed
// @access  Private
exports.getFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { category, search } = req.query;

  let query = supabase
    .from('community_posts')
    .select('*, author:profiles(*)', { count: 'exact' });

  if (category) {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data: posts, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const formattedPosts = posts.map(formatPost);

  res.status(200).json({
    success: true,
    count: formattedPosts.length,
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
    posts: formattedPosts
  });
});

// @desc    Get single post
// @route   GET /api/community/post/:id
// @access  Private
exports.getPost = asyncHandler(async (req, res) => {
  // Increment view is skipped for simplicity on BaaS unless a column views is added.
  // We just fetch the post.
  const { data: post, error } = await supabase
    .from('community_posts')
    .select('*, author:profiles(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !post) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  res.status(200).json({ success: true, post: formatPost(post) });
});

// @desc    Like / Unlike a post
// @route   PUT /api/community/post/:id/like
// @access  Private
exports.likePost = asyncHandler(async (req, res) => {
  const { data: post, error } = await supabase
    .from('community_posts')
    .select('likes')
    .eq('id', req.params.id)
    .single();

  if (error || !post) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  let likes = post.likes || [];
  const alreadyLiked = likes.includes(req.user.id);
  if (alreadyLiked) {
    likes = likes.filter(id => id !== req.user.id);
  } else {
    likes.push(req.user.id);
  }

  const { error: updateErr } = await supabase
    .from('community_posts')
    .update({ likes })
    .eq('id', req.params.id);

  if (updateErr) {
    return res.status(400).json({ success: false, error: updateErr.message });
  }

  res.status(200).json({ success: true, liked: !alreadyLiked, likeCount: likes.length });
});

// @desc    Add a comment
// @route   POST /api/community/comment/:postId
// @access  Private
exports.addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ success: false, error: 'Comment cannot be empty.' });
  }

  const { data: post, error } = await supabase
    .from('community_posts')
    .select('comments')
    .eq('id', req.params.postId)
    .single();

  if (error || !post) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  const comments = post.comments || [];
  
  // Format comment with author details matching old Schema
  comments.push({
    author: {
      _id: req.user.id,
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar
    },
    content: content.trim(),
    createdAt: new Date().toISOString()
  });

  const { error: updateErr } = await supabase
    .from('community_posts')
    .update({ comments })
    .eq('id', req.params.postId);

  if (updateErr) {
    return res.status(400).json({ success: false, error: updateErr.message });
  }

  res.status(201).json({ success: true, message: 'Comment posted.', comments });
});

// @desc    Delete own post
// @route   DELETE /api/community/post/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res) => {
  const { data: post, error } = await supabase
    .from('community_posts')
    .select('user_id')
    .eq('id', req.params.id)
    .single();

  if (error || !post) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized to delete this post.' });
  }

  const { error: deleteErr } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', req.params.id);

  if (deleteErr) {
    return res.status(400).json({ success: false, error: deleteErr.message });
  }

  res.status(200).json({ success: true, message: 'Post removed.' });
});
