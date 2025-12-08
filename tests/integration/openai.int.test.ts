/**
 * OpenAIService Integration Tests (Jest Version)
 */

import { OpenAIService } from "../../src/services/OpenAIService";
import { ConnectionManager } from "../../src/controllers/ConnectionManager";
import { SessionManager } from "../../src/controllers/SessionManager";

describe("OpenAIService Integration Tests", () => {
    let service: OpenAIService;
    let connectionManager: ConnectionManager;
    let sessionManager: SessionManager;
    const testSessionId = "test-session-123";

    beforeEach(() => {
        process.env.OPENAI_API_KEY = "test-api-key-mock";
        connectionManager = new ConnectionManager();
        sessionManager = new SessionManager();
        service = new OpenAIService(connectionManager, sessionManager);
    });

    afterEach(() => {
        sessionManager.removeSession(testSessionId);
    });

    test("should not process chain for inactive session", async () => {
        const chatRequest = {
            messages: [{ role: "user" as const, content: "Hello" }]
        };

        const ttsOptions = {
            model: "tts-1" as const,
            voice: "alloy" as const,
            input: ""
        };

        let thrown = undefined;

        try {
            await service.processChain(chatRequest, ttsOptions, testSessionId);
        } catch (e) {
            thrown = e;
        }

        expect(thrown).toBeUndefined();
    });

    test("should handle invalid chat request gracefully", async () => {
        sessionManager.addSession(testSessionId);

        const invalidRequest = {
            messages: []
        };

        const ttsOptions = {
            model: "tts-1" as const,
            voice: "alloy" as const,
            input: ""
        };

        let thrown = undefined;
        try {
            await service.processChain(invalidRequest, ttsOptions, testSessionId);
        } catch (e) {
            thrown = e;
        }

        expect(thrown).toBeUndefined();
    });
});
