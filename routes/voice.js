// routes/voice.js
const express = require("express");
const multer = require("multer");
const router = express.Router();

const { transcribeAudio, chatCompletion } = require("../services/groq");
const { textToSpeech } = require("../services/elevenlabs");
const { asyncHandler } = require("../middleware/errorHandler");

// Audio comes in as multipart/form-data under the field name "audio".
// Kept in memory (not written to disk) since files are short voice clips.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap
});

// POST /api/voice/transcribe
// multipart/form-data, field name: "audio"
// Returns: { text: string }
router.post(
  "/voice/transcribe",
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        code: "MISSING_AUDIO",
        message: "Request must include an 'audio' file field (multipart/form-data).",
      });
    }

    const text = await transcribeAudio(
      req.file.buffer,
      req.file.originalname || "audio.webm",
      req.file.mimetype || "audio/webm"
    );

    res.status(200).json({ text });
  })
);

// POST /api/voice/speak
// Body: { text: string }
// Streams back audio/mpeg
router.post(
  "/voice/speak",
  asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: true,
        code: "MISSING_TEXT",
        message: "Request body must include a non-empty 'text' string.",
      });
    }

    const audioBuffer = await textToSpeech(text);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });
    res.status(200).send(audioBuffer);
  })
);

// POST /api/voice/process
// multipart/form-data, field name: "audio"
// Full loop: STT -> LLM -> TTS in one call.
// Returns: { userText, aiText, audioBase64 }
router.post(
  "/voice/process",
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        code: "MISSING_AUDIO",
        message: "Request must include an 'audio' file field (multipart/form-data).",
      });
    }

    // Optional prior conversation history can be passed as a JSON string field.
    let history = [];
    if (req.body.history) {
      try {
        const parsed = JSON.parse(req.body.history);
        if (Array.isArray(parsed)) history = parsed;
      } catch {
        // Ignore malformed history rather than failing the whole pipeline.
      }
    }

    const userText = await transcribeAudio(
      req.file.buffer,
      req.file.originalname || "audio.webm",
      req.file.mimetype || "audio/webm"
    );

    if (!userText) {
      return res.status(200).json({
        userText: "",
        aiText: "",
        audioBase64: "",
        note: "No speech detected in audio.",
      });
    }

    const aiText = await chatCompletion(userText, history);
    const audioBuffer = await textToSpeech(aiText);

    res.status(200).json({
      userText,
      aiText,
      audioBase64: audioBuffer.toString("base64"),
    });
  })
);

module.exports = router;
