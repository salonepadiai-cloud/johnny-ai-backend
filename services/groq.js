// services/groq.js
// Wraps Groq's OpenAI-compatible API for:
//   1. Speech-to-text (Whisper large-v3)
//   2. Chat completions (Llama 3) with the JOHNNY AI persona

const axios = require("axios");
const FormData = require("form-data");

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const WHISPER_MODEL = "whisper-large-v3";
const CHAT_MODEL = "llama-3.3-70b-versatile";

const JOHNNY_SYSTEM_PROMPT = `You are JOHNNY, a voice assistant running on a phone.
Rules:
- Be concise, intelligent, and direct. This is spoken aloud, not read on a screen.
- Default to 1-3 short sentences unless the user explicitly asks for more detail.
- No markdown, no bullet points, no headers — plain spoken sentences only.
- No filler like "As an AI" or "I'd be happy to". Just answer.
- If a request is ambiguous, make a reasonable assumption and answer; only ask a clarifying question if you genuinely cannot proceed without it.
- Sound natural when read aloud by a TTS engine (contractions are fine, avoid symbols/abbreviations that don't speak well).`;

function assertGroqKey() {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error("GROQ_API_KEY is not set in environment variables.");
    err.status = 500;
    err.code = "MISSING_GROQ_KEY";
    throw err;
  }
}

/**
 * Transcribe an audio buffer using Groq's Whisper large-v3 model.
 * @param {Buffer} audioBuffer - raw audio file bytes (webm/wav/mp3/etc)
 * @param {string} filename - original filename, used to hint the format to Groq
 * @param {string} mimetype - mime type of the uploaded audio
 * @returns {Promise<string>} transcribed text
 */
async function transcribeAudio(audioBuffer, filename = "audio.webm", mimetype = "audio/webm") {
  assertGroqKey();

  const form = new FormData();
  form.append("file", audioBuffer, { filename, contentType: mimetype });
  form.append("model", WHISPER_MODEL);
  form.append("response_format", "json");

  const response = await axios.post(`${GROQ_BASE_URL}/audio/transcriptions`, form, {
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      ...form.getHeaders(),
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30000,
  });

  return response.data?.text?.trim() || "";
}

/**
 * Send a chat message + history to Groq's Llama 3 model with the JOHNNY persona.
 * @param {string} message - latest user message
 * @param {Array<{role: string, content: string}>} history - prior conversation turns
 * @returns {Promise<string>} AI text reply
 */
async function chatCompletion(message, history = []) {
  assertGroqKey();

  const messages = [
    { role: "system", content: JOHNNY_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message },
  ];

  const response = await axios.post(
    `${GROQ_BASE_URL}/chat/completions`,
    {
      model: CHAT_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 400,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const reply = response.data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const err = new Error("Groq chat completion returned no content.");
    err.status = 502;
    err.code = "EMPTY_GROQ_RESPONSE";
    throw err;
  }
  return reply;
}

module.exports = {
  transcribeAudio,
  chatCompletion,
  JOHNNY_SYSTEM_PROMPT,
};
