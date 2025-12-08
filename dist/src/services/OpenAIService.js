"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
/**
 * OpenAIService
 * --------------
 * Provides all interaction with OpenAI models, including:
 *
 * - Chat completions
 * - Text-to-speech (TTS)
 * - Chunked TTS streaming back to clients
 * - Retry with backoff
 * - Error handling and reporting
 *
 * This service communicates back to clients via ConnectionManager and
 * respects session cancellation via SessionManager.
 */
const openai_1 = __importDefault(require("openai"));
const types_1 = require("../types/types");
const Logger_1 = require("./Logger");
const util_1 = require("../util/util");
class OpenAIService {
    /** Maximum number of characters allowed per TTS chunk - OpenAI Documentation */
    static DEFAULT_MAX_TTS_CHARS = 4096;
    ai;
    connectionManager;
    sessionManager;
    /**
     * Constructs a new OpenAIService instance.
     *
     * @param connectionManager - Used to send messages back audio/error messages to WebSocket clients
     * @param sessionManager - Tracks active sessions
     */
    constructor(connectionManager, sessionManager) {
        this.connectionManager = connectionManager;
        this.sessionManager = sessionManager;
        this.ai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    /**
     * Main pipeline: Chat → TTS audio -> sending back to chunks to client.
     *
     * @param chatRequest - Chat completion request object
     * @param ttsOptions - TTS configuration
     * @param sessionId - Active session ID
     * @param timeoutMs - Optional timeout
     */
    async processChain(chatRequest, ttsOptions, sessionId, timeoutMs) {
        try {
            if (!this.sessionManager.isActive(sessionId)) {
                throw new types_1.APIError(400, "Session is not active");
            }
            Logger_1.log.info(`Processing chain for session ${sessionId}`);
            const responseText = await (0, util_1.retryWithBackoff)(() => this.getChatCompletion(chatRequest), 1, 1000);
            if (!responseText.trim()) {
                throw new types_1.APIError(500, "Empty response from chat completion");
            }
            Logger_1.log.info(`Chat completion received (${responseText.length} chars): ${responseText.substring(0, 100)}...`);
            ttsOptions.input = responseText;
            await (0, util_1.retryWithBackoff)(() => this.getTTSAudioStream(responseText, ttsOptions, sessionId), 1, 1000);
            Logger_1.log.info(`Chain processing completed for session ${sessionId}`);
        }
        catch (error) {
            this.handleError(error, sessionId);
        }
    }
    /**
     * Sends chat completion request to OpenAI.
     *
     * @param chatRequest - Request body for OpenAI chat completion
     * @returns The model's output text
     */
    async getChatCompletion(chatRequest) {
        try {
            Logger_1.log.info("Requesting chat completion from OpenAI...");
            const response = await this.ai.chat.completions.create({
                ...chatRequest,
                model: chatRequest.model || "gpt-3.5-turbo",
                stream: false,
            });
            const content = response.choices[0]?.message?.content?.trim();
            if (!content) {
                throw new types_1.APIError(500, "Empty response from LLM");
            }
            Logger_1.log.info(`Chat completion success: ${content.length} characters`);
            return content;
        }
        catch (error) {
            if (error instanceof openai_1.default.APIError) {
                Logger_1.log.error(`OpenAI API Error: ${error.message} (Status: ${error.status})`);
                throw new types_1.APIError(error.status || 500, error.message);
            }
            throw error;
        }
    }
    /**
     * Performs TTS conversion and streams base64-encoded audio chunks
     * to the WebSocket client.
     *
     * @param text - Text to convert to speech
     * @param options - TTS settings
     * @param sessionId - Target session
     */
    async getTTSAudioStream(text, options, sessionId) {
        try {
            Logger_1.log.info(`Starting TTS for session ${sessionId}. Text length: ${text.length}`);
            const chunks = (0, util_1.smartSplit)(text, OpenAIService.DEFAULT_MAX_TTS_CHARS);
            Logger_1.log.info(`Split text into ${chunks.length} chunks`);
            for (let i = 0; i < chunks.length; i++) {
                if (!this.sessionManager.isActive(sessionId)) {
                    Logger_1.log.warn(`Session ${sessionId} became inactive during TTS processing. Stopping.`);
                    break;
                }
                try {
                    Logger_1.log.info(`Generating TTS chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
                    const response = await this.ai.audio.speech.create({
                        model: options.model || "tts-1",
                        voice: options.voice || "alloy",
                        input: chunks[i],
                        response_format: "mp3",
                    });
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    Logger_1.log.info(`TTS chunk ${i + 1} generated: ${(buffer.length / 1024).toFixed(2)} KB`);
                    const sent = this.sendToWebSocket(sessionId, {
                        type: 'tts_audio',
                        data: {
                            audio: buffer.toString("base64"),
                            chunkIndex: i,
                            totalChunks: chunks.length,
                            isLast: i === chunks.length - 1
                        },
                        timestamp: Date.now()
                    });
                    if (!sent) {
                        Logger_1.log.error(`Failed to send TTS chunk ${i + 1} to session ${sessionId}`);
                        break;
                    }
                }
                catch (chunkError) {
                    Logger_1.log.error(`Error processing TTS chunk ${i + 1}:`, chunkError);
                    throw chunkError;
                }
            }
            Logger_1.log.info(`TTS audio stream completed for session ${sessionId}`);
        }
        catch (error) {
            if (error instanceof openai_1.default.APIError) {
                Logger_1.log.error(`OpenAI TTS API Error: ${error.message} (Status: ${error.status})`);
                throw new types_1.APIError(error.status || 500, error.message);
            }
            throw error;
        }
    }
    /**
     * Handles all errors and forwards them to WebSocket clients.
     *
     * @param error - Error object
     * @param sessionId - The session to notify
     */
    handleError(error, sessionId) {
        Logger_1.log.error('Chain processing error:', error);
        let errorMessage = 'An unexpected error occurred';
        let errorCode = 500;
        if (error instanceof types_1.ValidationError) {
            errorMessage = `Validation error: ${error.message}`;
            errorCode = 400;
        }
        else if (error instanceof types_1.RateLimitError) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
            errorCode = 429;
        }
        else if (error instanceof types_1.APIError) {
            errorMessage = error.message;
            errorCode = error.statusCode;
        }
        else if (error instanceof openai_1.default.APIError) {
            errorMessage = `OpenAI API error: ${error.message}`;
            errorCode = error.status || 500;
        }
        // Send error to WebSocket
        this.sendToWebSocket(sessionId, {
            type: 'error',
            data: {
                code: errorCode,
                message: errorMessage,
                details: error instanceof types_1.APIError ? error.details : undefined
            },
            timestamp: Date.now()
        });
    }
    /**
     * Sends a message to the WebSocket client for the given session.
     *
     * @param sessionId - The session to send to
     * @param message - Serializable JSON payload
     * @returns True if the send succeeded
     */
    sendToWebSocket(sessionId, message) {
        if (!this.sessionManager.isActive(sessionId)) {
            Logger_1.log.error(`Failed to send message to session ${sessionId}`);
            return false;
        }
        try {
            return this.connectionManager.send(sessionId, message);
        }
        catch (error) {
            Logger_1.log.error(`Failed to send message to session ${sessionId}:`, error);
            return false;
        }
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=OpenAIService.js.map