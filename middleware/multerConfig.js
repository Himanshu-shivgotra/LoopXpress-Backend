import multer from 'multer';

const storage = multer.memoryStorage(); // Store image in memory as a buffer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
});

export default upload;
