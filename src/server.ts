import "dotenv/config";

import { SocketManager } from "./controllers/SocketManager";
import { log } from "./services/Logger";
import { createServer as createHttpServer, Server as HttpServer} from "http";

export class Server {

  private server: HttpServer;
  private socketManager: SocketManager;

  constructor() {
    this.server = createHttpServer();
    this.socketManager = new SocketManager(this.server);
  }

  start(port: string) {
    
    this.server.on("request", (req, res) => {
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.listen(port, () => {
      log.info(`WebSocket server running on ws://localhost:${port}/ws`);
      log.info(`Health check at http://localhost:${port}/health`);
    });

    process.on("SIGINT", () => this.shutdown("SIGINT"));
    process.on("SIGTERM", () => this.shutdown("SIGTERM"));
  }

  async shutdown(signal: string) {
    try {
      log.info(`Received ${signal}. Shutting down gracefully...`);

      // Stop accepting new connections
      this.server.close(() => {
        log.info("HTTP server closed.");
      });

      await this.socketManager.closeAllConnectionsGracefully();

      process.exit(0);
    } catch (err) {
      log.error("Error during shutdown:", err);
      process.exit(1);
    }
  }

}

const port = process.env.PORT || '8000';
const serverInstance = new Server();
serverInstance.start(port);