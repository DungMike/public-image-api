const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = 6969;

// Enable CORS cho tất cả origins với options chi tiết hơn
app.use(cors({
  origin: true, // Reflect request origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Serve static files từ thư mục 'public'
app.use('/images', express.static(path.join(__dirname, 'public')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Image Server API',
    endpoints: {
      images: '/images/:filename - Access images directly',
      list: '/api/images - List all images',
      reorder: '/api/reorder-images - Rename images sequentially (GET)'
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

// Rename all images sequentially based on creation time
app.get('/api/reorder-images', async (req, res) => {
  const publicDir = path.join(__dirname, 'public', 'Whisk-Downloads-4');
  
  try {
    const files = await fs.promises.readdir(publicDir);
    
    // Filter image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    if (imageFiles.length === 0) {
      return res.json({ message: 'No images found to reorder' });
    }

    // Get file sorting info from filename (extract number before first underscore)
    // format: 1_name.png -> order: 1
    const fileStats = imageFiles.map((filename) => {
      const filePath = path.join(publicDir, filename);
      const match = filename.match(/^(\d+)_/);
      // Default to a high number if no number found, so they go to the end
      const order = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
      
      return {
        filename,
        path: filePath,
        order
      };
    });

    // Sort by extracted number
    fileStats.sort((a, b) => a.order - b.order);

    // Rename process
    // 1. Rename to temporary names to avoid conflicts
    const tempRenames = [];
    for (const file of fileStats) {
      const ext = path.extname(file.filename);
      // Generate temp name
      const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
      const tempPath = path.join(publicDir, tempName);
      
      await fs.promises.rename(file.path, tempPath);
      tempRenames.push({
        currentPath: tempPath,
        originalExt: ext
      });
    }

    // 2. Rename to final sequential names (001, 002, ...)
    const results = [];
    for (let i = 0; i < tempRenames.length; i++) {
      const file = tempRenames[i];
      const stats = fileStats[i]; // Get corresponding stats

      // Determine new filename number
      let seqNum;
      if (stats.order !== Number.MAX_SAFE_INTEGER) {
        // Use the original number from filename (e.g. 1 -> 001, 4 -> 004)
        // Preserving the gap as requested
        seqNum = String(stats.order).padStart(3, '0');
      } else {
        // For files without number prefix, use a safe fallback
        seqNum = `unk_${String(i + 1).padStart(3, '0')}`;
      }

      const newFilename = `${seqNum}${file.originalExt}`;
      const newPath = path.join(publicDir, newFilename);
      
      await fs.promises.rename(file.currentPath, newPath);
      results.push({
        old: stats.filename,
        new: newFilename
      });
    }

    res.json({
      message: 'Images reordered successfully',
      count: results.length,
      changes: results
    });

  } catch (err) {
    console.error('Error reordering images:', err);
    res.status(500).json({ 
      error: 'Failed to reorder images',
      details: err.message 
    });
  }
});

// API Upload Image
app.post('/api/upload-image', upload.single('file'), async (req, res) => {
  const publicDir = path.join(__dirname, 'public', 'Whisk-Downloads-4');
  
  try {
    const { name } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Image name is required' });
    }

    // Ensure directory exists
    await fs.promises.mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, name);
    
    // Write file to disk (overwrites if exists)
    await fs.promises.writeFile(filePath, file.buffer);

    res.json({
      message: 'Image uploaded successfully',
      filename: name,
      url: `http://localhost:${PORT}/images/Whisk-Downloads-4/${name}`
    });

  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: err.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Image Server is running on port ${PORT}`);
  console.log(`📁 Serving images from 'public' folder`);
  console.log(`🌐 Access images at: http://localhost:${PORT}/images/<filename>`);
  console.log(`📋 List all images: http://localhost:${PORT}/api/images`);
  console.log(`🔄 Reorder images: GET http://localhost:${PORT}/api/reorder-images`);
});
