import { OpenAIService } from "../../src/services/OpenAIService";
import { strict as assert } from "node:assert";
import { describe, it, beforeEach, mock } from "node:test";

import { APIError } from "../../src/types/types";
describe("Smart Split", () => {
    let openApiService: OpenAIService;

    beforeEach(() => {
        process.env.OPENAI_API_KEY = "test-api-key";
        openApiService = new OpenAIService(null as any, null as any);
    });

    it("splits long text into safe TTS chunks", () => {
        const long = "Some Text! ".repeat(1000);
        const chunks = openApiService.smartSplit(long);
        assert(chunks.every(c => c.length <= 4096));
        assert(chunks.length > 1);
    });

    it("returns single chunk when short", () => {
        assert.deepStrictEqual(openApiService.smartSplit("Hi"), ["Hi"]);
    });

    it("handles empty text", () => {
        assert.deepStrictEqual(openApiService.smartSplit(""), [""]);
    });

    it("splits at sentence boundaries", () => {
        const text = "First sentence. ".repeat(500) + "Last sentence.";
        const chunks = openApiService.smartSplit(text);

        assert(chunks.every(c => c.length <= 4096));
        assert(chunks.every(c => c.trim().endsWith('.')));
    });

    it("handles text exactly at limit", () => {
        const text = "A".repeat(4096);
        const chunks = openApiService.smartSplit(text);
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].length, 4096);
    });
});

describe("Retry Logic", () => {
    let openApiService: OpenAIService;

    beforeEach(() => {
        process.env.OPENAI_API_KEY = "test-api-key";
        openApiService = new OpenAIService(null as any, null as any);
    });

    it("should retry on transient failures", async () => {
        const service = new OpenAIService(null as any, null as any);
        let attemptCount = 0;

        const operation = mock.fn(async () => {
            attemptCount++;
            if (attemptCount < 3) {
                throw new Error("Transient error");
            }
            return "success";
        });

        const result = await (service as any).retryWithBackoff(operation, 3, 10);

        assert.strictEqual(result, "success");
        assert.strictEqual(attemptCount, 3);
        assert.strictEqual(operation.mock.calls.length, 3);
    });

    it("should throw after max retries", async () => {
        const service = new OpenAIService(null as any, null as any);

        const operation = mock.fn(async () => {
            throw new Error("Persistent error");
        });

        await assert.rejects(
            async () => (service as any).retryWithBackoff(operation, 3, 10),
            /Persistent error/
        );

        assert.strictEqual(operation.mock.calls.length, 3);
    });
});