const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' }); // use local uploads folder

require('dotenv').config(); // load REMOVE_BG_API_KEY from .env

// Serve static frontend from public folder
app.use(express.static('public'));

// API endpoint for background removal
app.post('/api/process-image', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  try {
    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(req.file.path));
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    fs.unlink(req.file.path, () => {}); // delete uploaded file

    if (!response.ok) {
      const errText = await response.text();
      console.error('remove.bg error:', errText);
      return res.status(response.status).send('Remove.bg API failed');
    }

    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    res.json({ image: `data:image/png;base64,${base64}` });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Internal server error');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
