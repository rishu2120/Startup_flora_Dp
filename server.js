const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve your frontend files from 'public' folder
app.use(express.static('public'));

// API endpoint to remove background
app.post('/api/remove-bg', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Prepare form data for remove.bg API
    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(req.file.path));
    formData.append('size', 'auto');

    // Call remove.bg API
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    // Delete uploaded file after processing
    fs.unlink(req.file.path, () => {});

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove.bg API error:', errorText);
      return res.status(response.status).send('Failed to process image.');
    }

    // Get image buffer and convert to base64 data URL
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');

    // Send JSON with base64 image string
    res.json({ image: `data:image/png;base64,${base64}` });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Something went wrong.');
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
