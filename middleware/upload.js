const multer = require('multer');

// Use memory storage to upload buffers to Supabase Storage instead of Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed.'), false);
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}).single('avatar');

const uploadPostMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).array('media', 5);

module.exports = { uploadAvatar, uploadPostMedia };
