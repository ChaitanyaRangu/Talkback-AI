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
import { WebSocketServer } from "ws";
import {Server as HttpServer} from "http";
import { randomUUID } from 'crypto';

import { log } from "../services/Logger";
import { OpenAIService } from "../services/OpenAIService";
import {ChatCompletionRequest, WebSocketMessage, TTSRequest} from "../types/types"
import { ConnectionManager } from "./ConnectionManager";
import { SessionManager } from "./SessionManager";

export class SocketManager{


  /** Underlying WebSocket server instance */
  private webSocketServer: WebSocketServer;

  /** Service for LLM + TTS processing */
  private openAIService: OpenAIService;

  /** Manages socket connections */
  private connectionManager: ConnectionManager;

  /** Tracks active sessions */
  private sessionManager: SessionManager;

  constructor(server: HttpServer) {
    this.webSocketServer = new WebSocketServer({server: server});
    this.connectionManager = new ConnectionManager();
    this.sessionManager = new SessionManager();
    this.openAIService = new OpenAIService(this.connectionManager, this.sessionManager);
    this.setupWebSocket();
  }

  /**
   * Initializes WebSocket event listeners for:
   * - connection
   * - message
   * - close
   * - error
   */
  private setupWebSocket() {
    this.webSocketServer.on("connection", (ws, req) => {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      log.info("New connection from", ip);

      const sessionId = randomUUID();
      this.connectionManager.register(sessionId, ws);

      /**
       * Handles all incoming messages from clients.
       */
      ws.on("message", async (data: WebSocketMessage) => {
        try {
          const {reqType, text} = JSON.parse(data.toString());
          
          if(reqType == "cancel") {
            this.sessionManager.removeSession(sessionId);
            return ;
          }

          this.sessionManager.addSession(sessionId);

          if (!text || typeof text !== "string") {
            ws.send(JSON.stringify({ error: "text field required" }));
            return;
          }

          const userText = text.trim();

          const chatOptions: ChatCompletionRequest = {messages: [{role: 'user', content: userText}]}
          const ttsOptions: TTSRequest = {input: ""}

          ws.send(JSON.stringify({ status: "msg received" }));
          ws.send(JSON.stringify({ status: "thinking" }));

          await this.openAIService.processChain(chatOptions, ttsOptions, sessionId, 0)
        } catch (err: any) {
          log.error("Message handling error:", err);
          ws.send(JSON.stringify({ error: "Internal error" }));
        }
      });
      /**
       * Cleanup when client disconnects.
       */
      ws.on("close", () => {
        this.sessionManager.removeSession(sessionId);
        this.connectionManager.unregister(sessionId);
        log.info("Client disconnected") 
      });
      ws.on("error", (err) => log.error("WebSocket error:", err));
      
    })
  }

  /**
   * Closes all WebSocket connections gracefully, sending a shutdown signal.
   *
   * @returns Promise resolving once all connections are closed
   */
  async closeAllConnectionsGracefully(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    this.connectionManager.getAllConenctions().forEach((ws, sessionId) => {
      try {
        // Send shutdown message to client
        ws.send(JSON.stringify({
          type: "server_shutdown",
          data: { message: "Server is shutting down" },
        }));

        // Wrap the 'close' event in a promise to wait for it
        const closePromise = new Promise<void>((resolve) => {
          ws.once("close", () => resolve());
        });

        // Close the connection with 1001 code (Going Away)
        ws.close(1001, "Server shutdown");

        closePromises.push(closePromise);
      } catch (err) {
        console.error(`Error closing connection ${sessionId}:`, err);
      }
    });

    // Wait for all connections to close
    await Promise.all(closePromises);
    console.log("All WebSocket connections closed gracefully.");
  }

}