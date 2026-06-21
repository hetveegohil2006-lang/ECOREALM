const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');

// Map database notification with profile join to frontend expected format
const formatNotification = (n) => {
  if (!n) return null;
  return {
    _id: n.id,
    id: n.id,
    recipient: n.recipient,
    title: n.title,
    message: n.message,
    isRead: n.is_read,
    readAt: n.read_at,
    createdAt: n.created_at,
    sender: n.sender_profile ? {
      _id: n.sender_profile.id,
      username: n.sender_profile.username,
      avatar: n.sender_profile.avatar
    } : null
  };
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const { data: notifications, count, error } = await supabase
    .from('notifications')
    .select('*, sender_profile:profiles!notifications_sender_fkey(*)', { count: 'exact' })
    .eq('recipient', req.user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const formatted = (notifications || []).map(formatNotification);

  res.status(200).json({
    success: true,
    count: formatted.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      total: count || 0
    },
    data: formatted
  });
});

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const { data: notification, error: getErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (getErr || !notification) {
    return res.status(404).json({ success: false, error: 'Notification not found.' });
  }

  if (notification.recipient !== req.user.id) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this notification.' });
  }

  const { data: updated, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(200).json({ success: true, data: formatNotification(updated) });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient', req.user.id)
    .eq('is_read', false);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { data: notification, error: getErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (getErr || !notification) {
    return res.status(404).json({ success: false, error: 'Notification not found.' });
  }

  if (notification.recipient !== req.user.id) {
    return res.status(401).json({ success: false, error: 'Not authorized.' });
  }

  const { error: deleteErr } = await supabase
    .from('notifications')
    .delete()
    .eq('id', req.params.id);

  if (deleteErr) {
    return res.status(400).json({ success: false, error: deleteErr.message });
  }

  res.status(200).json({ success: true, message: 'Notification removed.' });
});
