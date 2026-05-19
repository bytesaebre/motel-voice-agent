import express from "express";
import { Request, Response } from "express";
import { generateResponse, endConversation } from "../handler/gemini";

const WebhookRouter = express.Router();

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

WebhookRouter.post("/voice", (req: Request, res: Response) => {
  const callSid = req.body.CallSid;
  console.log("POST /voice received, CallSid:", callSid);

  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for calling The Grand Plaza, how may I assist you today?</Say>
    <Gather input="speech" action="/webhooks/voice/response" timeout="5" speechTimeout="auto">
        <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
    </Gather>
    <Say voice="alice">I didn't receive any input. Goodbye.</Say>
    <Hangup/>
</Response>`);
});

WebhookRouter.post("/voice/response", async (req: Request, res: Response) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult || "";
  console.log("POST /voice/response received, CallSid:", callSid, "speech:", speechResult);

  try {
    const aiResponse = await generateResponse(callSid, speechResult);

    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${escapeXml(aiResponse)}</Say>
    <Gather input="speech" action="/webhooks/voice/response" timeout="5" speechTimeout="auto">
        <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
    </Gather>
    <Say voice="alice">I didn't receive any input. Goodbye.</Say>
    <Hangup/>
</Response>`);
  } catch (error) {
    console.error("Gemini error for CallSid:", callSid, error);
    endConversation(callSid);
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">I'm sorry, I'm having trouble processing your request. Please try again later.</Say>
    <Hangup/>
</Response>`);
  }
});

WebhookRouter.get("/voice", (_req: Request, res: Response) => {
  res.send("Voice webhook endpoint is live. Use POST to trigger TwiML.");
});

WebhookRouter.get("/voice/response", (_req: Request, res: Response) => {
  res.send("Voice response endpoint is live. Use POST to trigger TwiML.");
});

export default WebhookRouter;
