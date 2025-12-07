import { OpenAIService } from "../../src/services/OpenAIService";
import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";

describe("smartSplit()", () => {
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
});