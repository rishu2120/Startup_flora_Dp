```js
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ use memory storage (no local uploads folder needed)
const upload = multer({ storage: multer.memoryStorage() });

// Root check
app.get("/", (req, res) => {
  res.send("🚀 Frame App backend is running");
});

// Remove background API
app.post("/api/remove-bg", upload.single("photo"), async (req, res) => {
  try {
    const apiKey = process.env.REMOVE_BG_API_KEY;

    if (!apiKey) {
      return res
        .status(402)
        .json({ error: "No REMOVE_BG_API_KEY found in .env" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert uploaded file buffer to base64
    const base64Img = req.file.buffer.toString("base64");

    // Call remove.bg API
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: new URLSearchParams({
        image_file_b64: base64Img,
        size: "auto",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("remove.bg error:", text);
      return res.status(500).json({ error: text });
    }

    const buffer = await response.buffer();
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

    res.json({ image: dataUrl });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server (for local testing only, Vercel uses serverless)
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

module.exports = app;
```
