import WebSocket from "ws";
import http from "http";
import { SocketManager } from "../../src/controllers/SocketManager";
import OpenAI from "openai";

jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: "This is a mock response." } }],
          }),
        },
      },
      audio: {
        speech: {
          create: jest.fn().mockResolvedValue({
            arrayBuffer: async () => Buffer.from("fake-mp3-data").buffer,
          }),
        },
      },
    })),
  };
});


describe("E2E – Chat + TTS pipeline (Jest)", () => {
  let httpServer: http.Server;
  let port: number;

  beforeAll(async () => {
    process.env.OPENAI_API_KEY = "test-api-key";
    httpServer = http.createServer();
    new SocketManager(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        port = typeof address === "string" ? 0 : (address as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it("runs processChain and returns TTS audio", async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    const received: any[] = [];

    const donePromise = new Promise<void>((resolve, reject) => {
      ws.on("message", (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          received.push(data);

          if (data.type === "tts_audio" && data.data?.isLast) {
            try {
              const Mocked = OpenAI as unknown as jest.Mock;
              const openaiInstance = Mocked.mock.results[0]?.value;
              expect(
                openaiInstance.chat.completions.create
              ).toHaveBeenCalledTimes(1);
              expect(openaiInstance.audio.speech.create).toHaveBeenCalledTimes(1);

              expect(received).toEqual(
                expect.arrayContaining([
                  { status: "msg received" },
                  { status: "thinking" },
                ])
              );

              expect(data.data.audio).toBeDefined();
              expect(data.data.totalChunks).toBe(1);
              expect(data.data.chunkIndex).toBe(0);

              ws.close();
              resolve();
            } catch (err) {
              ws.close();
              reject(err as Error);
            }
          }
        } catch (err) {
          ws.close();
          reject(err as Error);
        }
      });

      ws.on("open", () => {
        ws.send(JSON.stringify({ reqType: "prompt", text: "Hello AI!" }));
      });

      ws.on("error", (err) => {
        ws.close();
        reject(err as Error);
      });

      ws.on("close", () => {
        // If the test did not resolve via final chunk, fail it
        if (!received.find((d) => d.type === "tts_audio" && d.data?.isLast)) {
          reject(new Error("WebSocket closed before final TTS chunk"));
        }
      });
    });

    await donePromise;
  });
});
