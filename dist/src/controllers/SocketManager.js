"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketManager = void 0;
/**
 * SocketManager
 * -------------
 * Handles WebSocket server operations:
 *
 * - Accepts incoming WebSocket connections
 * - Assigns unique session IDs
 * - Routes incoming messages to OpenAIService
 * - Sends status + streaming responses back to the client
 * - Cleans up sessions on disconnect
 *
 * Relies on:
 * - ConnectionManager for tracking sockets
 * - SessionManager for tracking active sessions
 * - OpenAIService for chat + TTS pipeline
 */
const ws_1 = require("ws");
const crypto_1 = require("crypto");
const Logger_1 = require("../services/Logger");
const OpenAIService_1 = require("../services/OpenAIService");
const ConnectionManager_1 = require("./ConnectionManager");
const SessionManager_1 = require("./SessionManager");
class SocketManager {
    /** Underlying WebSocket server instance */
    webSocketServer;
    /** Service for LLM + TTS processing */
    openAIService;
    /** Manages socket connections */
    connectionManager;
    /** Tracks active sessions */
    sessionManager;
    constructor(server) {
        this.webSocketServer = new ws_1.WebSocketServer({ server: server });
        this.connectionManager = new ConnectionManager_1.ConnectionManager();
        this.sessionManager = new SessionManager_1.SessionManager();
        this.openAIService = new OpenAIService_1.OpenAIService(this.connectionManager, this.sessionManager);
        this.setupWebSocket();
    }
    /**
     * Initializes WebSocket event listeners for:
     * - connection
     * - message
     * - close
     * - error
     */
    setupWebSocket() {
        this.webSocketServer.on("connection", (ws, req) => {
            const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            Logger_1.log.info("New connection from", ip);
            const sessionId = (0, crypto_1.randomUUID)();
            this.connectionManager.register(sessionId, ws);
            /**
             * Handles all incoming messages from clients.
             */
            ws.on("message", async (data) => {
                try {
                    const { reqType, text, voice } = JSON.parse(data.toString());
                    if (reqType == "cancel") {
                        this.sessionManager.removeSession(sessionId);
                        return;
                    }
                    this.sessionManager.addSession(sessionId);
                    if (!text || typeof text !== "string") {
                        ws.send(JSON.stringify({ error: "text field required" }));
                        return;
                    }
                    const userText = text.trim();
                    const chatOptions = { messages: [{ role: 'user', content: userText }] };
                    const ttsOptions = { input: "", voice: voice }; // leaving input empty
                    ws.send(JSON.stringify({ status: "msg received" }));
                    ws.send(JSON.stringify({ status: "thinking" }));
                    await this.openAIService.processChain(chatOptions, ttsOptions, sessionId, 0);
                }
                catch (err) {
                    Logger_1.log.error("Message handling error:", err);
                    ws.send(JSON.stringify({ error: "Internal error" }));
                }
            });
            /**
             * Cleanup when client disconnects.
             */
            ws.on("close", () => {
                this.sessionManager.removeSession(sessionId);
                this.connectionManager.unregister(sessionId);
                Logger_1.log.info("Client disconnected");
            });
            ws.on("error", (err) => Logger_1.log.error("WebSocket error:", err));
        });
    }
    /**
     * Closes all WebSocket connections gracefully, sending a shutdown signal.
     *
     * @returns Promise resolving once all connections are closed
     */
    async closeAllConnectionsGracefully() {
        const closePromises = [];
        this.connectionManager.getAllConenctions().forEach((ws, sessionId) => {
            try {
                // Send shutdown message to client
                ws.send(JSON.stringify({
                    type: "server_shutdown",
                    data: { message: "Server is shutting down" },
                }));
                // Wrap the 'close' event in a promise to wait for it
                const closePromise = new Promise((resolve) => {
                    ws.once("close", () => resolve());
                });
                // Close the connection with 1001 code (Going Away)
                ws.close(1001, "Server shutdown");
                closePromises.push(closePromise);
            }
            catch (err) {
                console.error(`Error closing connection ${sessionId}:`, err);
            }
        });
        // Wait for all connections to close
        await Promise.all(closePromises);
        console.log("All WebSocket connections closed gracefully.");
    }
}
exports.SocketManager = SocketManager;
//# sourceMappingURL=SocketManager.js.map