export interface ChatCompletionRequest {
  messages: Array<{
    role: 'user';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }>;
}

export interface TTSRequest {
  input: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: string;
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac';
  speed?: number;
}

export interface WebSocketMessage {
  type: 'tts_audio' | 'error' | 'complete' | 'info';
  data: string | ArrayBuffer | object;
  timestamp: number;
}

// Custom error classes for better error handling
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter?: number) {
    super(429, 'Rate limit exceeded', { retryAfter });
    this.name = 'RateLimitError';
  }
}