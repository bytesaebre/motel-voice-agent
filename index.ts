import express, { Request, Response } from "express";
import WebhookRouter from "./src/router/webhooks";

const app = express();

app.use(express.json());
app.use("/webhooks", WebhookRouter);

app.get("/", (req: Request, res: Response) => {
    console.log("Server is running");
    res.send("Server is running");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port", process.env.PORT || 3000);
});