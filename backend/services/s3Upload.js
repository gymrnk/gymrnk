// services/s3Upload.js  – AWS SDK v3
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer   = require('multer');
const multerS3 = require('multer-s3-v3');
const { v4: uuidv4 } = require('uuid');

// S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// accept images only
const fileFilter = (req, file, cb) =>
  file.mimetype.startsWith('image/')
    ? cb(null, true)
    : cb(new Error('Invalid file type. Only images are allowed.'), false);

// Multer-S3 storage
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: (req, file, cb) =>
      cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      const fname = `${req.user._id}/${uuidv4()}-${Date.now()}.${ext}`;
      cb(null, fname);
    },
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// helper to delete by URL
const deleteFile = async (fileUrl) => {
  try {
    const key = fileUrl.split('/').slice(3).join('/');
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }),
    );
  } catch (err) {
    console.error('Error deleting S3 object:', err);
  }
};

module.exports = { upload, deleteFile };
