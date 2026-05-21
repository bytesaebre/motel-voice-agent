import { WebSocket, WebSocketServer } from "ws";
import { streamTts } from "./tts";
import { getPendingStreamText, endConversation } from "./gemini";
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
              await streamResponseFromBuffer(ws, call);
            }
            break;

          case "media":
            break;

          case "stop":
            console.log("Stream stopped, StreamSid:", msg.streamSid);
            endCallStream(ws, activeCalls.get(ws)?.callSid);
            activeCalls.delete(ws);
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
      endCallStream(ws, activeCalls.get(ws)?.callSid);
      activeCalls.delete(ws);
    });

    ws.on("error", (err: Error) => {
      console.error("WebSocket error:", err.message);
      endCallStream(ws, activeCalls.get(ws)?.callSid);
      activeCalls.delete(ws);
    });
  });

  return wss;
}

function endCallStream(ws: WebSocket, callSid?: string): void {
  if (callSid) {
    endConversation(callSid);
  }
}

async function streamResponseFromBuffer(ws: WebSocket, call: CallState): Promise<void> {
  const text = getPendingStreamText(call.callSid);
  if (!text) {
    console.error("No pending stream text for call", call.callSid);
    return;
  }

  try {
    const ttsChunks = streamTts(text);
    for await (const audioChunk of ttsChunks) {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          event: "media",
          streamSid: call.streamSid,
          media: { payload: audioChunk.toString("base64") },
        })
      );
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "mark", streamSid: call.streamSid, mark: { name: "end" } }));
    }
  } catch (err) {
    console.error("Error streaming response:", err);
  }
}
