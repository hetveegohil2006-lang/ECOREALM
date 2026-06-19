const express = require('express');
const router = express.Router();
const { createPost, getFeed, getPost, likePost, addComment, deletePost } = require('../controllers/communityController');
const { protect } = require('../middleware/auth');
const { postValidator } = require('../utils/validators');
const { uploadPostMedia } = require('../middleware/upload');

router.get('/feed',              protect, getFeed);
router.post('/post',             protect, uploadPostMedia, postValidator, createPost);
router.get('/post/:id',          protect, getPost);
router.put('/post/:id/like',     protect, likePost);
router.post('/comment/:postId',  protect, addComment);
router.delete('/post/:id',       protect, deletePost);

module.exports = router;
