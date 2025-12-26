const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 6969;

// Enable CORS cho tất cả origins
app.use(cors());

// Serve static files từ thư mục 'public'
app.use('/images', express.static(path.join(__dirname, 'public')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Image Server API',
    endpoints: {
      images: '/images/:filename - Access images directly',
      list: '/api/images - List all images'
    }
  });
});

// API để list tất cả ảnh trong thư mục public
app.get('/api/images', (req, res) => {
  const publicDir = path.join(__dirname, 'public');
  
  fs.readdir(publicDir, (err, files) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Unable to read directory',
        details: err.message 
      });
    }
    
    // Lọc chỉ lấy file ảnh (jpg, jpeg, png, gif, webp, svg)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    // Tạo full URLs cho mỗi ảnh
    const imageUrls = images.map(filename => ({
      filename: filename,
      url: `http://localhost:${PORT}/images/${filename}`
    }));
    
    res.json({
      total: imageUrls.length,
      images: imageUrls
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Image Server is running on port ${PORT}`);
  console.log(`📁 Serving images from 'public' folder`);
  console.log(`🌐 Access images at: http://localhost:${PORT}/images/<filename>`);
  console.log(`📋 List all images: http://localhost:${PORT}/api/images`);
});
