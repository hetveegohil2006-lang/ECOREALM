const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'username avatar');

  const total = await Notification.countDocuments({ recipient: req.user._id });

  res.status(200).json({
    success: true,
    count: notifications.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total
    },
    data: notifications
  });
});

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ success: false, error: 'Notification not found.' });
  }

  // Make sure notification belongs to user
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this notification.' });
  }

  notification.isRead = true;
  notification.readAt = Date.now();
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: Date.now() } }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ success: false, error: 'Notification not found.' });
  }

  // Make sure notification belongs to user
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(401).json({ success: false, error: 'Not authorized.' });
  }

  await notification.deleteOne();

  res.status(200).json({ success: true, message: 'Notification removed.' });
});
