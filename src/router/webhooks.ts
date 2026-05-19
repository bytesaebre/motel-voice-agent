import express from "express";
import { Request, Response } from "express";

const WebhookRouter = express.Router();

WebhookRouter.post("/voice", (req: Request, res: Response) => {
    console.log("POST /voice received, CallSid:", req.body.CallSid);

    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello, welcome to the Motel 6 front desk. How can I help you?</Say>
    <Gather input="speech" action="/webhooks/voice/response" timeout="5" speechTimeout="auto">
        <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
    </Gather>
    <Say voice="alice">I didn't receive any input. Goodbye.</Say>
    <Hangup/>
</Response>`);
});

WebhookRouter.post("/voice/response", (req: Request, res: Response) => {
    const speechResult = req.body.SpeechResult || "";
    console.log("POST /voice/response received, speech:", speechResult);

    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">You said: ${speechResult}. We'll get back to you shortly.</Say>
    <Hangup/>
</Response>`);
});

WebhookRouter.get("/voice", (_req: Request, res: Response) => {
    res.send("Voice webhook endpoint is live. Use POST to trigger TwiML.");
});

WebhookRouter.get("/voice/response", (_req: Request, res: Response) => {
    res.send("Voice response endpoint is live. Use POST to trigger TwiML.");
});

export default WebhookRouter;