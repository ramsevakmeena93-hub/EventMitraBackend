const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'eventmitra/event-images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }]
  }
});

const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only jpg, jpeg, png files allowed'));
  }
});

module.exports = { cloudinary, uploadImages };
