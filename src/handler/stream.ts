import { WebSocket, WebSocketServer } from "ws";
import { streamTts } from "./tts";
import { generateResponseStream, parseResponse, endConversation } from "./gemini";
import type { Server } from "http";

interface CallState {
  callSid: string;
  streamSid: string;
}

const activeCalls = new Map<WebSocket, CallState>();

export function createStreamServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Media stream connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.event) {
          case "connected":
            console.log("Twilio stream connected event");
            break;

          case "start":
            console.log("Stream started, StreamSid:", msg.streamSid, "CallSid:", msg.start?.callSid);
            activeCalls.set(ws, {
              callSid: msg.start?.callSid || "",
              streamSid: msg.streamSid,
            });

            const call = activeCalls.get(ws);
            if (call?.callSid) {
              await streamGeminiToTwilio(ws, call);
            }
            break;

          case "media":
            break;

          case "stop":
            console.log("Stream stopped, StreamSid:", msg.streamSid);
            cleanup(ws);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error processing stream message:", err);
      }
    });

    ws.on("close", () => {
      console.log("Media stream disconnected");
      cleanup(ws);
    });

    ws.on("error", (err: Error) => {
      console.error("WebSocket error:", err.message);
      cleanup(ws);
    });
  });

  return wss;
}

function cleanup(ws: WebSocket): void {
  const call = activeCalls.get(ws);
  if (call?.callSid) {
    endConversation(call.callSid);
  }
  activeCalls.delete(ws);
}

async function streamGeminiToTwilio(ws: WebSocket, call: CallState): Promise<void> {
  let fullText = "";
  let buffer = "";

  try {
    const textGen = generateResponseStream(call.callSid);

    for await (const chunk of textGen) {
      fullText += chunk;
      buffer += chunk;

      const sentenceEnd = buffer.match(/[.!?]\s*/);
      if (sentenceEnd && sentenceEnd.index !== undefined) {
        const sentence = buffer.slice(0, sentenceEnd.index + 1).trim();
        buffer = buffer.slice(sentenceEnd.index + sentenceEnd[0].length);

        for await (const audioChunk of streamTts(sentence)) {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(
            JSON.stringify({
              event: "media",
              streamSid: call.streamSid,
              media: { payload: audioChunk.toString("base64") },
            })
          );
        }
      }
    }

    if (buffer.trim()) {
      for await (const audioChunk of streamTts(buffer.trim())) {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(
          JSON.stringify({
            event: "media",
            streamSid: call.streamSid,
            media: { payload: audioChunk.toString("base64") },
          })
        );
      }
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          event: "mark",
          streamSid: call.streamSid,
          mark: { name: "end" },
        })
      );
    }

    const action = parseResponse(fullText).action;
    if (action === "hangup" || action === "transfer") {
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, 2000);
    }
  } catch (err) {
    console.error("Error in Gemini-to-Twilio stream:", err);
  }
}
