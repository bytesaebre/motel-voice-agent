import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHistory, appendMessage, clearHistory } from "./conversation";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment");
}

const genAI = new GoogleGenerativeAI(apiKey);

const systemPrompt = `"You are the front desk AI assistant for Motel 6 in Simpsonville, South Carolina.
You answer incoming calls, help guests with reservations, and transfer urgent requests to human staff.

HOTEL DETAILS:
- Address: 3706 Grandview dr., Simpsonville, SC, 29680
- Phone: (864) 767-8566
- Check-in: 3:00 PM | Check-out: 11:00 AM
- WiFi: Network "Motel 6 Simpsonville SC" / Password at front desk
- Rooms: 1 Bed ($70) | 2 Bed ($76.99)
- Pet friendly Rooms
- Weekly Available: $420 for single person, $455 for 2 | No pets allowed for weekly

ADDITIONAL DETIALS
- Parking availabile for trucks
- Coffee in the Morning (5 O'clcok)
- No Breakfast
- All rooms are non-smoking
- Requires $50 Deposit if bringing Pet


RULES:
- Greet warmly: "Thank you for calling Motel 6 Simpsonville, how may I assist you today?"
- Always confirm dates and room type before "booking"
- If caller says "emergency," "complaint," or "manager," transfer immediately
- Never make up availability — always use the check_availability function
- Keep responses under 2-3 sentences. Be concise and professional.
- Ask for callback number if the line is noisy or you can't hear clearly"`;

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: systemPrompt,
});

export async function generateResponse(callSid: string, userMessage: string): Promise<string> {
  const history = getHistory(callSid);

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(userMessage);
  const responseText = result.response.text();

  appendMessage(callSid, { role: "user", parts: [{ text: userMessage }] });
  appendMessage(callSid, { role: "model", parts: [{ text: responseText }] });

  return responseText;
}

export function endConversation(callSid: string): void {
  clearHistory(callSid);
}
