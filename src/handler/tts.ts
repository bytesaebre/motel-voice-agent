const ttsApiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;
const ttsEndpoint = ttsApiKey
  ? `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`
  : null;

function splitIntoSentences(text: string): string[] {
  const segments = text.split(/(?<=[.!?])\s+/);
  return segments.filter((s) => s.trim().length > 0);
}

async function synthesizeSentence(text: string): Promise<Buffer | null> {
  if (!ttsEndpoint) return null;

  const response = await fetch(ttsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Chirp3-HD-Kore",
      },
      audioConfig: {
        audioEncoding: "MULAW",
        sampleRateHertz: 8000,
      },
    }),
  });

  if (!response.ok) {
    console.error("TTS API error:", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as { audioContent?: string };
  if (!data.audioContent) return null;

  return Buffer.from(data.audioContent, "base64");
}

export async function* streamTts(text: string): AsyncGenerator<Buffer> {
  if (!ttsEndpoint) {
    console.warn("No TTS API key configured — skipping audio synthesis");
    return;
  }

  const sentences = splitIntoSentences(text);
  for (const sentence of sentences) {
    const audio = await synthesizeSentence(sentence);
    if (audio) yield audio;
  }
}
