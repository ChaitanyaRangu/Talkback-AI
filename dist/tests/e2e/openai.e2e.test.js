"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const SocketManager_1 = require("../../src/controllers/SocketManager");
const openai_1 = __importDefault(require("openai"));
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
    let httpServer;
    let port;
    beforeAll(async () => {
        process.env.OPENAI_API_KEY = "test-api-key";
        httpServer = http_1.default.createServer();
        new SocketManager_1.SocketManager(httpServer);
        await new Promise((resolve) => {
            httpServer.listen(0, () => {
                const address = httpServer.address();
                port = typeof address === "string" ? 0 : address.port;
                resolve();
            });
        });
    });
    afterAll(async () => {
        await new Promise((resolve) => httpServer.close(() => resolve()));
    });
    it("runs processChain and returns TTS audio", async () => {
        const ws = new ws_1.default(`ws://localhost:${port}`);
        const received = [];
        const donePromise = new Promise((resolve, reject) => {
            ws.on("message", (msg) => {
                try {
                    const data = JSON.parse(msg.toString());
                    received.push(data);
                    if (data.type === "tts_audio" && data.data?.isLast) {
                        try {
                            const Mocked = openai_1.default;
                            const openaiInstance = Mocked.mock.results[0]?.value;
                            expect(openaiInstance.chat.completions.create).toHaveBeenCalledTimes(1);
                            expect(openaiInstance.audio.speech.create).toHaveBeenCalledTimes(1);
                            expect(received).toEqual(expect.arrayContaining([
                                { status: "msg received" },
                                { status: "thinking" },
                            ]));
                            expect(data.data.audio).toBeDefined();
                            expect(data.data.totalChunks).toBe(1);
                            expect(data.data.chunkIndex).toBe(0);
                            ws.close();
                            resolve();
                        }
                        catch (err) {
                            ws.close();
                            reject(err);
                        }
                    }
                }
                catch (err) {
                    ws.close();
                    reject(err);
                }
            });
            ws.on("open", () => {
                ws.send(JSON.stringify({ reqType: "prompt", text: "Hello AI!" }));
            });
            ws.on("error", (err) => {
                ws.close();
                reject(err);
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
//# sourceMappingURL=openai.e2e.test.js.map