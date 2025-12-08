import { OpenAIService } from "../../src/services/OpenAIService";

import {smartSplit, retryWithBackoff} from "../../src/util/util";

describe("Smart Split", () => {

    const DEFAULT_MAX_TTS_CHARS = 4096;

    test("splits long text into safe TTS chunks", () => {
        const long = "Some Text! ".repeat(1000);
        const chunks = smartSplit(long, DEFAULT_MAX_TTS_CHARS);
        expect(chunks.every(c => c.length <= 4096)).toBe(true);
        expect(chunks.length).toBeGreaterThan(1);
    });

    test("returns single chunk when short", () => {
        expect(smartSplit("Hi", DEFAULT_MAX_TTS_CHARS)).toEqual(["Hi"]);
    });

    test("handles empty text", () => {
        expect(smartSplit("", DEFAULT_MAX_TTS_CHARS)).toEqual([""]);
    });

    test("splits at sentence boundaries", () => {
        const text = "First sentence. ".repeat(500) + "Last sentence.";
        const chunks = smartSplit(text, DEFAULT_MAX_TTS_CHARS);

        expect(chunks.every(c => c.length <= DEFAULT_MAX_TTS_CHARS)).toBe(true);
        expect(chunks.every(c => c.trim().endsWith("."))).toBe(true);
    });

    test("handles text exactly at limit", () => {
        const text = "A".repeat(4096);
        const chunks = smartSplit(text, DEFAULT_MAX_TTS_CHARS);

        expect(chunks.length).toBe(1);
        expect(chunks[0].length).toBe(4096);
    });
});

describe("Retry Logic", () => {
    let openApiService: OpenAIService;

    beforeEach(() => {
        process.env.OPENAI_API_KEY = "test-api-key";
        openApiService = new OpenAIService(null as any, null as any);
    });

    test("should retry on transient failures", async () => {
        let attemptCount = 0;

        const operation = jest.fn(async () => {
            attemptCount++;
            if (attemptCount < 3) throw new Error("Transient error");
            return "success";
        });

        const result = await retryWithBackoff(operation, 3, 10);

        expect(result).toBe("success");
        expect(attemptCount).toBe(3);
        expect(operation).toHaveBeenCalledTimes(3);
    });

    test("should throw after max retries", async () => {
        const operation = jest.fn(async () => {
            throw new Error("Persistent error");
        });

        await expect(
            retryWithBackoff(operation, 3, 10)
        ).rejects.toThrow("Persistent error");

        expect(operation).toHaveBeenCalledTimes(3);
    });
});
