import { Content } from "@google/generative-ai";

const conversations = new Map<string, Content[]>();

export function getHistory(callSid: string): Content[] {
  if (!conversations.has(callSid)) {
    conversations.set(callSid, []);
  }
  return conversations.get(callSid)!;
}

export function appendMessage(callSid: string, message: Content): void {
  const history = getHistory(callSid);
  history.push(message);
}

export function clearHistory(callSid: string): void {
  conversations.delete(callSid);
}
