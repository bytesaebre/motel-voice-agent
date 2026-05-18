import express from "express";
import { Request, Response } from "express";

const WebhookRouter = express.Router();

WebhookRouter.post("/voice", (req: Request, res: Response) => {
    console.log("Voice webhook received");
    res.send("Voice webhook received");
});

export default WebhookRouter;