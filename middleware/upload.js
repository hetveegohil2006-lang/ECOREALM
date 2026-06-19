const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../services/cloudinaryService');

// Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecorealm/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
  }
});

// Cloudinary storage for community post images
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecorealm/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, quality: 'auto' }]
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed.'), false);
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}).single('avatar');

const uploadPostMedia = multer({
  storage: postStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).array('media', 5);

module.exports = { uploadAvatar, uploadPostMedia };
