const express = require('express');
const router = express.Router();
const { getAnalytics, getUsers, updateUserRole, banUser, createMission, createChallenge, removePost } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

router.get('/analytics',         getAnalytics);
router.get('/users',             getUsers);
router.put('/users/:id/role',    updateUserRole);
router.delete('/users/:id',      banUser);
router.post('/missions',         createMission);
router.post('/challenges',       createChallenge);
router.delete('/posts/:id',      removePost);

module.exports = router;
