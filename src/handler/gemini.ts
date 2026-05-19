import { GoogleGenerativeAI } from "@google/generative-ai";
import { getHistory, appendMessage, clearHistory } from "./conversation";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment");
}

const genAI = new GoogleGenerativeAI(apiKey);

const systemPrompt = process.env.PROMPT;

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
