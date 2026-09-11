// routes/ai.js
const express = require("express");
const router = express.Router();
const { chatCompletion } = require("../services/groq");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/ai/chat
// Body: { message: string, history: [{role, content}] }
// Returns: { reply: string }
router.post(
  "/ai/chat",
  asyncHandler(async (req, res) => {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: true,
        code: "MISSING_MESSAGE",
        message: "Request body must include a non-empty 'message' string.",
      });
    }

    const safeHistory = Array.isArray(history) ? history : [];

    const reply = await chatCompletion(message, safeHistory);
    res.status(200).json({ reply });
  })
);

module.exports = router;
