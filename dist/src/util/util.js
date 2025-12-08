"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
exports.smartSplit = smartSplit;
/**
   * Utility: Retries a promise-returning operation using exponential backoff.
   *
   * @param operation - Function to retry
   * @param maxRetries - Total retry attempts
   * @param baseDelay - Delay in ms before first retry
   * @returns The resolved value of the operation
   */
const openai_1 = __importDefault(require("openai"));
const Logger_1 = require("../services/Logger");
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    //TODO: Implement a exponential backoff strategy
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (error instanceof openai_1.default.APIError) {
                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }
            }
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                Logger_1.log.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
/**
 * Splits text into chunks of sentences suitable for TTS requests.
 */
function smartSplit(text, maxChunkSize) {
    if (text.length < maxChunkSize)
        return [text];
    const chunks = [];
    let currentChunk = "";
    const sentences = text.match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) || [text]; // Split on sentences
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
        }
        else {
            currentChunk += sentence;
        }
    }
    if (currentChunk)
        chunks.push(currentChunk.trim());
    return chunks;
}
//# sourceMappingURL=util.js.map