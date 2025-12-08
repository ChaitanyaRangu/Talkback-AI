"use strict";
/**
 * OpenAIService Integration Tests (Jest Version)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const OpenAIService_1 = require("../../src/services/OpenAIService");
const ConnectionManager_1 = require("../../src/controllers/ConnectionManager");
const SessionManager_1 = require("../../src/controllers/SessionManager");
describe("OpenAIService Integration Tests", () => {
    let service;
    let connectionManager;
    let sessionManager;
    const testSessionId = "test-session-123";
    beforeEach(() => {
        process.env.OPENAI_API_KEY = "test-api-key-mock";
        connectionManager = new ConnectionManager_1.ConnectionManager();
        sessionManager = new SessionManager_1.SessionManager();
        service = new OpenAIService_1.OpenAIService(connectionManager, sessionManager);
    });
    afterEach(() => {
        sessionManager.removeSession(testSessionId);
    });
    test("should not process chain for inactive session", async () => {
        const chatRequest = {
            messages: [{ role: "user", content: "Hello" }]
        };
        const ttsOptions = {
            model: "tts-1",
            voice: "alloy",
            input: ""
        };
        let thrown = undefined;
        try {
            await service.processChain(chatRequest, ttsOptions, testSessionId);
        }
        catch (e) {
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
            model: "tts-1",
            voice: "alloy",
            input: ""
        };
        let thrown = undefined;
        try {
            await service.processChain(invalidRequest, ttsOptions, testSessionId);
        }
        catch (e) {
            thrown = e;
        }
        expect(thrown).toBeUndefined();
    });
});
//# sourceMappingURL=openai.int.test.js.map