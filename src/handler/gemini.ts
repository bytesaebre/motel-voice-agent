import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHistory, appendMessage, clearHistory } from "./conversation";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment");
}

const genAI = new GoogleGenerativeAI(apiKey);

const systemPrompt = `You are the front desk AI assistant for Motel 6 in Simpsonville, South Carolina.
You answer incoming calls, help guests with reservations, and transfer urgent requests to human staff.

HOTEL DETAILS:
- Address: 3706 Grandview dr., Simpsonville, SC, 29680
- Phone: (864) 767-8566
- Check-in: 3:00 PM | Check-out: 11:00 AM
- WiFi: Network "Motel 6 Simpsonville SC" / Password at front desk
- Rooms: 1 Bed ($70) | 2 Bed ($76.99)
- Pet friendly Rooms
- Weekly Available: $420 for single person, $455 for 2 | No pets allowed for weekly

ADDITIONAL DETAILS
- Parking available for trucks
- Coffee in the Morning (5 O'clock)
- No Breakfast
- All rooms are non-smoking
- Requires $50 Deposit if bringing Pet

RULES:
- The greeting has already been said. Just respond to the user's question.
- Always confirm dates and room type before "booking".
- If caller says "emergency", "complaint", or "manager", transfer immediately.
- Never make up availability — always use the check_availability function.
- Keep responses under 2-3 sentences. Be concise and professional.
- Ask for callback number if the line is noisy or you can't hear clearly.

RESPONSE FORMAT:
Return ONLY valid JSON with no markdown formatting, no code fences, no extra text:
{"text": "your spoken response here", "action": "continue"}

Valid actions: "continue" (keep conversation going), "transfer" (transfer to human), "hangup" (end call).`;

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: systemPrompt,
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export interface GeminiResponse {
  text: string;
  action: "continue" | "transfer" | "hangup";
}

const pendingStreamText = new Map<string, string>();

export async function generateResponse(callSid: string, userMessage: string): Promise<GeminiResponse> {
  const history = getHistory(callSid);

  const chat = model.startChat({ history });

  const streamResult = await chat.sendMessageStream(userMessage);
  let fullText = "";
  for await (const chunk of streamResult.stream) {
    const chunkText = chunk.text();
    if (chunkText) fullText += chunkText;
  }

  appendMessage(callSid, { role: "user", parts: [{ text: userMessage }] });
  appendMessage(callSid, { role: "model", parts: [{ text: fullText }] });

  try {
    const parsed = JSON.parse(fullText.trim()) as GeminiResponse;
    if (!parsed.text || !parsed.action) throw new Error("Invalid JSON");
    pendingStreamText.set(callSid, parsed.text);
    return parsed;
  } catch {
    pendingStreamText.set(callSid, fullText.trim());
    return { text: fullText.trim(), action: "continue" };
  }
}

export function getPendingStreamText(callSid: string): string | undefined {
  const text = pendingStreamText.get(callSid);
  pendingStreamText.delete(callSid);
  return text;
}

export function endConversation(callSid: string): void {
  clearHistory(callSid);
  pendingStreamText.delete(callSid);
}
