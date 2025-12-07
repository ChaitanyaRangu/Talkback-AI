import { strict as assert } from "node:assert";
import { describe, it, beforeEach, afterEach } from "node:test";

// Set mock API key before imports
process.env.OPENAI_API_KEY = "test-api-key-mock";

import { OpenAIService } from "../../src/services/OpenAIService";
import { ConnectionManager } from "../../src/controllers/ConnectionManager";
import { SessionManager } from "../../src/controllers/SessionManager";

describe("OpenAIService Integration Tests", () => {
    let service: OpenAIService;
    let connectionManager: ConnectionManager;
    let sessionManager: SessionManager;
    const testSessionId = "test-session-123";

    beforeEach(() => {
        connectionManager = new ConnectionManager();
        sessionManager = new SessionManager();
        service = new OpenAIService(connectionManager, sessionManager);
    });

    afterEach(() => {
        sessionManager.removeSession(testSessionId);
    });

    it("should not process chain for inactive session", async () => {
        const chatRequest = {
            messages: [{ role: "user" as const, content: "Hello" }]
        };
        const ttsOptions = {
            model: "tts-1" as const,
            voice: "alloy" as const,
            input: ""
        };

        let catchedError;
        try{
            // Should not throw, but handle error internally
            await service.processChain(chatRequest, ttsOptions, testSessionId)
            // Error should be logged and sent to WebSocket (if connected)
        }
        catch(e) {
            catchedError = e;
        }

        assert.deepStrictEqual(catchedError, undefined);
    });

    it("should handle invalid chat request gracefully", async () => {
        sessionManager.addSession(testSessionId);

        const invalidRequest = {
            messages: [] // Empty messages array
        };
        const ttsOptions = {
            model: "tts-1" as const,
            voice: "alloy" as const,
            input: ""
        };

        // Should not throw, but handle error internally
        await service.processChain(invalidRequest, ttsOptions, testSessionId);
        // Error should be logged and sent to WebSocket (if connected)
    });

});