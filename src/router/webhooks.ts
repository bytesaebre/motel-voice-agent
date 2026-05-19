import express from "express";
import { Request, Response } from "express";

const WebhookRouter = express.Router();

WebhookRouter.post("/voice", (req: Request, res: Response) => {
    console.log("Voice webhook received");
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Hello, welcome to the Motel 6 front desk. How can I help you?</Say>
    <Gather input="speech" action="/webhooks/voice/response" timeout="5">
        <Say>I didn't catch that. Please try again.</Say>
    </Gather>
</Response>`;
    res.setHeader("Content-Type", "text/xml");
    res.send(twiml);
});

WebhookRouter.get("/voice", (_req: Request, res: Response) => {
    res.send("Voice webhook endpoint is live. Use POST to trigger TwiML.");
});

export default WebhookRouter;