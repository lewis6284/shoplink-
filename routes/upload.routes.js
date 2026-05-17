const express = require('express');
const upload = require('../utils/upload');
const ApiResponse = require('../utils/response');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Protected upload route
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload a file', 400);
    }

    // Return the relative path to be stored in the DB
    // Assuming the app serves 'public' as static root
    const filePath = `/uploads/${req.file.filename}`;
    
    return ApiResponse.success(res, { url: filePath }, 'File uploaded successfully');
  } catch (error) {
    console.error('Upload Error:', error);
    return ApiResponse.error(res, error.message || 'Upload failed', 500);
  }
});

module.exports = router;
