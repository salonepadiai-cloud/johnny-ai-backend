// routes/health.js
const express = require("express");
const router = express.Router();

const startTime = Date.now();

router.get("/health", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: "ok",
    uptimeSeconds,
    apiKeys: {
      groq: Boolean(process.env.GROQ_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
      elevenlabsVoiceId: Boolean(process.env.ELEVENLABS_VOICE_ID),
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
