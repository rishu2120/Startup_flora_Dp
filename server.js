
// server.js
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();

// ✅ Use memory storage (no disk writes, works on Vercel)
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Server is running");
});

// API route for background removal
app.post("/api/remove-bg", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "REMOVE_BG_API_KEY missing in .env" });
    }

    // Send file buffer to remove.bg
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: new URLSearchParams({
        "image_file_b64": req.file.buffer.toString("base64"),
        "size": "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }

    const buffer = await response.buffer();

    // Convert to base64 DataURL for frontend
    const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;
    res.json({ image: base64Image });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server (local only, Vercel ignores this)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
