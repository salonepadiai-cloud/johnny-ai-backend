// services/elevenlabs.js
// Wraps ElevenLabs text-to-speech API. Returns audio as a Buffer (audio/mpeg)
// so callers can either pipe it straight to an HTTP response or base64-encode it.

const axios = require("axios");

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

function assertElevenLabsConfig() {
  if (!process.env.ELEVENLABS_API_KEY) {
    const err = new Error("ELEVENLABS_API_KEY is not set in environment variables.");
    err.status = 500;
    err.code = "MISSING_ELEVENLABS_KEY";
    throw err;
  }
  if (!process.env.ELEVENLABS_VOICE_ID) {
    const err = new Error("ELEVENLABS_VOICE_ID is not set in environment variables.");
    err.status = 500;
    err.code = "MISSING_ELEVENLABS_VOICE_ID";
    throw err;
  }
}

/**
 * Convert text to speech via ElevenLabs and return the raw MP3 audio buffer.
 * @param {string} text - text to speak
 * @param {object} [options]
 * @param {string} [options.voiceId] - override the default voice ID
 * @param {string} [options.modelId] - ElevenLabs model id (defaults to multilingual v2)
 * @returns {Promise<Buffer>} audio/mpeg buffer
 */
async function textToSpeech(text, options = {}) {
  assertElevenLabsConfig();

  const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID;
  const modelId = options.modelId || "eleven_multilingual_v2";

  const response = await axios.post(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );

  return Buffer.from(response.data);
}

module.exports = {
  textToSpeech,
};
