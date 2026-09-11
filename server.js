// server.js
// JOHNNY AI Assistant — backend entry point.
// Voice pipeline: Groq Whisper (STT) -> Groq Llama 3 (chat) -> ElevenLabs (TTS).
// No frontend/UI code lives here — pure API server, deploy-ready for Render/Railway.

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const aiRoutes = require("./routes/ai");
const voiceRoutes = require("./routes/voice");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS ---
// ALLOWED_ORIGINS is a comma-separated env var (see .env.example).
// Falls back to allowing all origins if not set, so local dev never breaks,
// but you should always set this explicitly in production.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, mobile webviews, server-to-server).
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS.`));
    },
  })
);

// --- Body parsing ---
// JSON payloads (chat, speak). Audio uploads use multer in routes/voice.js,
// which handles multipart bodies separately from this JSON parser.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Request logging (lightweight, useful on Render logs) ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// --- Routes ---
app.use("/", healthRoutes);
app.use("/api", aiRoutes);
app.use("/api", voiceRoutes);

// 404 for anything unmatched
app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: "NOT_FOUND",
    message: `No route for ${req.method} ${req.originalUrl}`,
  });
});

// --- Centralized error handler (must be last) ---
app.use(errorHandler);

// --- Process-level safety nets so a bad request never kills the server ---
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
});

app.listen(PORT, () => {
  console.log(`JOHNNY AI backend running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});
