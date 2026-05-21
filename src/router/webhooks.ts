import express from "express";
import { Request, Response } from "express";
import { generateResponse, endConversation } from "../handler/gemini";

const WebhookRouter = express.Router();

const streamUrl = process.env.STREAM_URL || "wss://your-domain.com/media-stream";

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
    <Gather input="speech" action="/webhooks/voice/response" timeout="5" speechTimeout="auto">
        <Say voice="Google.en-US-Chirp3-HD-Kore">Thank you for calling Motel 6 Simpsonville, how may I assist you today?</Say>
    </Gather>
    <Say voice="Google.en-US-Chirp3-HD-Kore">I didn't receive any input. Goodbye.</Say>
    <Hangup/>
</Response>`);
});

WebhookRouter.post("/voice/response", async (req: Request, res: Response) => {
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult || "";
    console.log("POST /voice/response received, CallSid:", callSid, "speech:", speechResult);

    if (!speechResult.trim()) {
        console.log("Empty speech result for CallSid:", callSid, "— re-prompting");
        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="/webhooks/voice/response" timeout="5" speechTimeout="auto">
        <Say voice="Google.en-US-Chirp3-HD-Kore">I didn't catch that. Could you please repeat?</Say>
    </Gather>
    <Say voice="Google.en-US-Chirp3-HD-Kore">I didn't receive any input. Goodbye.</Say>
    <Hangup/>
</Response>`);
        return;
    }

    try {
        console.log("Calling Gemini for CallSid:", callSid);
        const aiResponse = await generateResponse(callSid, speechResult);
        console.log("Gemini response for CallSid:", callSid, ":", JSON.stringify(aiResponse));

        if (aiResponse.action === "hangup") {
            res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Google.en-US-Chirp3-HD-Kore">${escapeXml(aiResponse.text)}</Say>
    <Hangup/>
</Response>`);
            endConversation(callSid);
            return;
        }

        if (aiResponse.action === "transfer") {
            res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Google.en-US-Chirp3-HD-Kore">${escapeXml(aiResponse.text)}</Say>
    <Hangup/>
</Response>`);
            endConversation(callSid);
            return;
        }

        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${escapeXml(streamUrl)}" />
    </Connect>
    <Gather input="speech" action="/webhooks/voice/response" timeout="5" speechTimeout="auto">
        <Say voice="Google.en-US-Chirp3-HD-Kore">${escapeXml(aiResponse.text)}</Say>
    </Gather>
    <Say voice="Google.en-US-Chirp3-HD-Kore">I didn't receive any input. Goodbye.</Say>
    <Hangup/>
</Response>`);
    } catch (error) {
        console.error("Gemini error for CallSid:", callSid, error);
        endConversation(callSid);
        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Google.en-US-Chirp3-HD-Kore">I'm sorry, I'm having trouble processing your request. Please try again later.</Say>
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
