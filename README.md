# motel-voice-agent

AI-powered voice agent that acts as a motel front desk representative. Answers incoming phone calls via Twilio, understands caller questions using speech-to-text, generates intelligent responses with an LLM, and speaks back to the caller using text-to-speech.

## How It Works

```
Caller → Twilio Voice Webhook → Express Server → AI Agent → TwiML Response → Caller
```

1. A caller dials the Twilio phone number
2. Twilio sends a voice webhook (`POST /voice`) to this server
3. The server greets the caller and gathers speech input (TwiML `<Gather input="speech">`)
4. Speech is transcribed and sent to an LLM with a motel front desk persona
5. The LLM response is converted to speech and played back to the caller
6. Steps 3–5 repeat for a natural multi-turn conversation

## Tech Stack

- **Runtime:** Node.js (CommonJS)
- **Framework:** Express 5
- **Language:** TypeScript (source) + JavaScript (entry point)
- **Telephony:** Twilio Voice (webhooks, TwiML)
- **AI:** LLM + STT + TTS (provider TBD — e.g., OpenAI, Anthropic, Deepgram, ElevenLabs)

## Prerequisites

- Node.js 18+
- A [Twilio](https://www.twilio.com) account with a phone number
- A publicly accessible URL for local development ([ngrok](https://ngrok.com) recommended)
- API keys for your chosen AI/STT/TTS provider

## Environment Variables

Create a `.env` file in the project root:

```bash
PORT=3000
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
# AI provider keys (add based on your chosen provider)
OPENAI_API_KEY=sk-...
# DEEPGRAM_API_KEY=...
# ANTHROPIC_API_KEY=...
```

## Setup

```bash
npm install
cp .env.example .env   # then edit .env with your keys
npm run dev            # starts the server
```

For local webhook testing, expose your server with ngrok:

```bash
ngrok http 3000
```

Then configure your Twilio phone number's voice webhook URL to `https://<your-ngrok-url>/voice`.

## Project Structure

```
motel-voice-agent/
├── index.js              # Entry point — bootstraps the Express server
├── package.json
├── src/
│   ├── router/
│   │   └── webhooks.ts   # Twilio webhook route handlers
│   └── handler/          # Business logic (AI agent, conversation flow)
├── .env                  # Environment variables (git-ignored)
└── .gitignore
```

## Development

No build step is currently configured. TypeScript files in `src/` are intended to be compiled or run via `ts-node`/`tsx`.

To start development:

```bash
npm install
npm run dev
```

The server listens on the port defined in `.env` (default: 3000).
