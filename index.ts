import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import WebhookRouter from "./src/router/webhooks";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use((_req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; connect-src 'self'"
    );
    next();
});

app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path} body:`, JSON.stringify(req.body));
    next();
});

app.use("/webhooks", WebhookRouter);

app.get("/", (_req: Request, res: Response) => {
    console.log("Server is running");
    res.send("Server is running");
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err.message, err.stack);
    res.status(500).type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>We're experiencing technical difficulties. Please try again later.</Say>
    <Hangup/>
</Response>`);
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port", process.env.PORT || 3000);
});