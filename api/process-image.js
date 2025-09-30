// pages/api/process-image.js
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import multer from 'multer';
const upload = multer({ dest: '/tmp/' }); // Use a temporary folder

export const config = {
  api: {
    bodyParser: false, // Disable bodyParser to handle the file upload manually
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  return new Promise((resolve, reject) => {
    upload.single('photo')(req, res, async function (err) {
      if (err) {
        return reject(err);
      }
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }

      try {
        // Form data for remove.bg API
        const formData = new FormData();
        formData.append('image_file', fs.createReadStream(req.file.path));
        formData.append('size', 'auto'); // Automatically resize

        // Call remove.bg API
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': process.env.REMOVE_BG_API_KEY,
            ...formData.getHeaders(),
          },
          body: formData,
        });

        fs.unlink(req.file.path, () => {}); // Clean up temp file

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Remove.bg API error:', errorText);
          return res.status(response.status).send('Failed to process image');
        }

        const buffer = await response.buffer();
        const base64 = buffer.toString('base64');
        res.status(200).json({ image: `data:image/png;base64,${base64}` });

        resolve();
      } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Something went wrong');
        resolve();
      }
    });
  });
}
