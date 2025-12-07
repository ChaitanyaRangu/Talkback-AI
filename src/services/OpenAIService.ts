import OpenAI from "openai";
import {ChatCompletionRequest, ChatCompletionResponse, WebSocketMessage, TTSRequest, ValidationError, APIError, RateLimitError} from "../types/types"
import { log } from "./Logger";
import { ConnectionManager } from "../controllers/ConnectionManager";
import { SessionManager } from "../controllers/SessionManager";


interface MainService {

  ai: any;
  connectionManager: ConnectionManager;
  sessionManager: SessionManager;
  processChain(chatRequest: ChatCompletionRequest, ttsOptions: TTSRequest, sessionId: string, timeoutMs?: number): void;  
}

export class OpenAIService implements MainService{

  static readonly DEFAULT_MAX_TTS_CHARS = 4096;

  ai: OpenAI;
  connectionManager: ConnectionManager;
  sessionManager: SessionManager;


  constructor(connectionManager: ConnectionManager, sessionManager: SessionManager) {

    this.connectionManager = connectionManager;
    this.sessionManager = sessionManager;
    this.ai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async retryWithBackoff<T>(
      operation: () => Promise<T>,
      maxRetries: number = 3,
      baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

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

  async processChain(chatRequest: ChatCompletionRequest, ttsOptions: TTSRequest, sessionId: string, timeoutMs?: number): Promise<void> {
    try {
      if (!this.sessionManager.isActive(sessionId)) {
        throw new APIError(400, "Session is not active");
      }

      log.info(`Processing chain for session ${sessionId}`);
      
      const responseText: string = await this.retryWithBackoff(() => this.getChatCompletion(chatRequest), 1, 1000);
      
      if (!responseText.trim()) {
        throw new APIError(500, "Empty response from chat completion");
      }

      log.info(`Chat completion received (${responseText.length} chars): ${responseText.substring(0, 100)}...`);
      
      ttsOptions.input = responseText;
      await this.retryWithBackoff(() => this.getTTSAudioStream(responseText, ttsOptions, sessionId), 1, 1000);
      
      log.info(`Chain processing completed for session ${sessionId}`);
    } catch (error) {
      this.handleError(error as Error, sessionId);
    }
  }

  smartSplit(text: string) {
    if(text.length < OpenAIService.DEFAULT_MAX_TTS_CHARS) return [text];

    const chunks: string[] = [];
    let currentChunk = "";
    const sentences = text.match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) || [text]; // Split on sentences

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > OpenAIService.DEFAULT_MAX_TTS_CHARS) {
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


  private handleError(error: Error, sessionId: string): void {
    log.error('Chain processing error:', error);

    let errorMessage = 'An unexpected error occurred';
    let errorCode = 500;

    if (error instanceof ValidationError) {
      errorMessage = `Validation error: ${error.message}`;
      errorCode = 400;
    } else if (error instanceof RateLimitError) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      errorCode = 429;
    } else if (error instanceof APIError) {
      errorMessage = error.message;
      errorCode = error.statusCode;
    } else if (error instanceof OpenAI.APIError) {
      errorMessage = `OpenAI API error: ${error.message}`;
      errorCode = error.status || 500;
    }

    // Send error to WebSocket
    this.sendToWebSocket(sessionId, {
      type: 'error',
      data: {
        code: errorCode,
        message: errorMessage,
        details: error instanceof APIError ? error.details : undefined
      },
      timestamp: Date.now()
    });
  }

  private sendToWebSocket(
      sessionId: string,
      message: WebSocketMessage
    ): boolean {

    if(!this.sessionManager.isActive(sessionId)) {
      log.error(`Failed to send message to session ${sessionId}`);
      return false;
    }

    try {
      return this.connectionManager.send(sessionId, message);
    } catch (error) {
      log.error(`Failed to send message to session ${sessionId}:`, error);
      return false;
    }
  }

  async getChatCompletion(chatRequest: ChatCompletionRequest): Promise<string> {
    try {
      log.info("Requesting chat completion from OpenAI...");
      
      const response = await this.ai.chat.completions.create({
        ...chatRequest,
        model: chatRequest.model || "gpt-3.5-turbo",
        stream: false,
      });

      const content = response.choices[0]?.message?.content?.trim();
      
      if (!content) {
        throw new APIError(500, "Empty response from LLM");
      }
      
      log.info(`Chat completion success: ${content.length} characters`);
      return content;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        log.error(`OpenAI API Error: ${error.message} (Status: ${error.status})`);
        throw new APIError(error.status || 500, error.message);
      }
      throw error;
    }
  }

  async getTTSAudioStream(text: string, options: TTSRequest, sessionId: string): Promise<void> {
    try {
      log.info(`Starting TTS for session ${sessionId}. Text length: ${text.length}`);
      
      const chunks = this.smartSplit(text);
      log.info(`Split text into ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        if (!this.sessionManager.isActive(sessionId)) {
          log.warn(`Session ${sessionId} became inactive during TTS processing. Stopping.`);
          break;
        }

        try {
          log.info(`Generating TTS chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
          
          const response = await this.ai.audio.speech.create({
            model: options.model || "tts-1",
            voice: options.voice || "alloy",
            input: chunks[i],
            response_format: "mp3",
          });

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          log.info(`TTS chunk ${i + 1} generated: ${(buffer.length / 1024).toFixed(2)} KB`);

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
            log.error(`Failed to send TTS chunk ${i + 1} to session ${sessionId}`);
            break;
          }

        } catch (chunkError) {
          log.error(`Error processing TTS chunk ${i + 1}:`, chunkError);
          throw chunkError;
        }
      }

      log.info(`TTS audio stream completed for session ${sessionId}`);
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        log.error(`OpenAI TTS API Error: ${error.message} (Status: ${error.status})`);
        throw new APIError(error.status || 500, error.message);
      }
      throw error;
    }
  }

}