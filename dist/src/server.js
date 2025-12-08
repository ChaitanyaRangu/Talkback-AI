"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
require("dotenv/config");
const SocketManager_1 = require("./controllers/SocketManager");
const Logger_1 = require("./services/Logger");
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
class Server {
    server;
    socketManager;
    constructor() {
        this.server = (0, http_1.createServer)();
        this.socketManager = new SocketManager_1.SocketManager(this.server);
    }
    start(port) {
        this.server.on("request", (req, res) => {
            if (req.url === "/health" && req.method === "GET") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "ok" }));
            }
            else {
                res.writeHead(404);
                res.end();
            }
        });
        // Only for development purposes: serve a simple client UI
        const htmlPath = path_1.default.resolve("./client.html");
        this.server.listen(port, () => {
            Logger_1.log.info(`Health check at http://localhost:${port}/health`);
            Logger_1.log.info(`WebSocket server running on ws://localhost:${port}/ws`);
            Logger_1.log.info(`Client UI available at: file://${htmlPath}`);
        });
        process.on("SIGINT", () => this.shutdown("SIGINT"));
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
    }
    async shutdown(signal) {
        try {
            Logger_1.log.info(`Received ${signal}. Shutting down gracefully...`);
            // Stop accepting new connections
            this.server.close(() => {
                Logger_1.log.info("HTTP server closed.");
            });
            await this.socketManager.closeAllConnectionsGracefully();
            process.exit(0);
        }
        catch (err) {
            Logger_1.log.error("Error during shutdown:", err);
            process.exit(1);
        }
    }
}
exports.Server = Server;
const port = process.env.PORT || '8000';
const serverInstance = new Server();
serverInstance.start(port);
//# sourceMappingURL=server.js.map