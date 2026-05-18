# AGENTS.md

Guidelines for AI coding assistants working on this project.

## Commands

```bash
npm install         # Install dependencies
node index.js       # Run the server
# TODO: add dev script (tsx watch), build, lint, test
```

There is currently no build step, linter, or test suite configured.

## Architecture

- **Express 5** HTTP server, CommonJS module system
- **TypeScript** for source files (`src/`), plain JavaScript for entry point (`index.js`)
- **Routes** live in `src/router/`, business logic in `src/handler/`
- Twilio webhooks are handled as Express routes; every webhook must return valid **TwiML XML**, not JSON or plain text

## Webhook Flow

1. `POST /voice` — Twilio hits this when a call comes in
2. Handler generates TwiML (e.g., `<Say>`, `<Gather input="speech">`)
3. Speech result is POSTed back (configure `<Gather action="/voice/response">`)
4. Speech text is sent to LLM with motel front desk system prompt
5. LLM response is spoken back via `<Say>` or played as audio via `<Play>`
6. Loop continues or call ends with `<Hangup>`

## Constraints

- **Always return valid TwiML XML** with `Content-Type: text/xml` — Twilio rejects other formats
- **Validate Twilio webhook signatures** in production using `TWILIO_AUTH_TOKEN`
- **Use call SID** (`req.body.CallSid`) to track conversation state per call
- **No framework assumptions** — stick to Express 5 patterns already in the codebase
- **TypeScript in `src/`** — use TS for all source files, keep `index.js` as the plain JS bootstrap
- **Motel front desk persona** — the system prompt should role-play a helpful, professional motel front desk agent capable of handling reservations, check-in/out questions, amenities, local recommendations, and FAQs

## Dependencies

| Package | Purpose |
|---|---|
| `express@^5.2.1` | HTTP server and routing |
| `@types/express@^5.0.6` | TypeScript type definitions |

Expected future additions: Twilio SDK, AI provider SDK (OpenAI/Anthropic), STT/TTS service SDK, `dotenv`, `tsx`/`ts-node` for running TypeScript, TwiML builder utility.

## Style

- TypeScript for all source files, no implicit `any`
- Use `express.Router()` for route grouping (see `src/router/webhooks.ts`)
- Keep route handlers thin — extract business logic into `src/handler/`
- Follow existing naming conventions: kebab-case for files, camelCase for variables
