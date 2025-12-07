import "dotenv/config";

import { SocketManager } from "./controllers/SocketManager";
import { log } from "./services/Logger";
import { createServer as createHttpServer, Server as HttpServer} from "http";

export class Server {

  private server: HttpServer;

  constructor() {
    this.server = createHttpServer();
    new SocketManager(this.server);
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
  }
}

const port = process.env.PORT || '8000';
const serverInstance = new Server();
serverInstance.start(port);