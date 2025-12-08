/**
   * Utility: Retries a promise-returning operation using exponential backoff.
   *
   * @param operation - Function to retry
   * @param maxRetries - Total retry attempts
   * @param baseDelay - Delay in ms before first retry
   * @returns The resolved value of the operation
   */
import OpenAI from "openai";
import {log} from "../services/Logger";

export async function retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
        ): Promise<T>
{
    let lastError: Error | undefined;

    //TODO: Implement a exponential backoff strategy
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (error instanceof OpenAI.APIError) {
                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }
            }

            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                log.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Splits text into chunks of sentences suitable for TTS requests.
 */
export function smartSplit(text: string, maxChunkSize: number) {
    if(text.length < maxChunkSize) return [text];

    const chunks: string[] = [];
    let currentChunk = "";
    const sentences = text.match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) || [text]; // Split on sentences

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
}