# Talkback-AI

Talkback-AI is a Node.js-based server application that provides a WebSocket API for real-time chat and text-to-speech (TTS) services, integrating with OpenAI's APIs. It is designed for interactive conversational AI experiences, supporting both chat completion and TTS audio streaming.

## Features
- WebSocket server for real-time communication
- Chat completion using OpenAI's GPT models
- Text-to-speech (TTS) audio generation
- Modular architecture with controllers and services
- Comprehensive integration and unit tests

## Project Structure
```
Talkback-AI/
├── src/
│   ├── server.ts                # Main server entry point
│   ├── controllers/
│   │   ├── ConnectionManager.ts # Manages WebSocket connections
│   │   ├── SessionManager.ts    # Handles user sessions
│   │   └── SocketManager.ts     # Manages socket events and routing
│   ├── services/
│   │   ├── Logger.ts            # Logging utility
│   │   └── OpenAIService.ts     # OpenAI API integration
│   └── types/
│       └── types.ts             # Shared TypeScript types
├── tests/
│   ├── integration/
│   │   ├── open.integration.test.ts
│   │   └── wse2e.integration.test.ts
│   └── unit/
│       └── openAIService.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd Talkback-AI
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Running the Server
```sh
npm start
```

### Running Tests
```sh
npm test
```

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required for chat and TTS features)

## Usage
Connect to the WebSocket server and send chat messages. The server will respond with chat completions and TTS audio data.

## Documentation
See below for documentation of each class in the codebase.

---

# Class Documentation

## src/server.ts
### `Server`
- **Description:** Main server class that initializes the HTTP server, WebSocket server, and sets up controllers for handling connections, sessions, and socket events.
- **Constructor:**
  - `constructor(server: http.Server)`
- **Responsibilities:**
  - Listens for incoming WebSocket connections
  - Delegates connection handling to `ConnectionManager`

## src/controllers/ConnectionManager.ts
### `ConnectionManager`
- **Description:** Manages all active WebSocket connections, tracks connected clients, and handles connection lifecycle events.
- **Constructor:**
  - `constructor(server: WebSocket.Server)`
- **Responsibilities:**
  - Accepts new WebSocket connections
  - Removes closed/disconnected clients
  - Broadcasts messages to clients as needed

## src/controllers/SessionManager.ts
### `SessionManager`
- **Description:** Handles user session management, including session creation, validation, and cleanup.
- **Constructor:**
  - `constructor()`
- **Responsibilities:**
  - Creates and tracks user sessions
  - Associates sessions with WebSocket connections
  - Cleans up expired sessions

## src/controllers/SocketManager.ts
### `SocketManager`
- **Description:** Manages socket event routing, message parsing, and dispatching events to appropriate handlers.
- **Constructor:**
  - `constructor(connectionManager: ConnectionManager, sessionManager: SessionManager, openAIService: OpenAIService)`
- **Responsibilities:**
  - Listens for incoming messages on sockets
  - Routes messages to chat or TTS handlers
  - Sends responses back to clients

## src/services/Logger.ts
### `Logger`
- **Description:** Provides logging utilities for the application, supporting different log levels and output formats.
- **Constructor:**
  - `constructor()`
- **Responsibilities:**
  - Logs informational, warning, and error messages
  - Formats log output for readability

## src/services/OpenAIService.ts
### `OpenAIService`
- **Description:** Integrates with OpenAI's API for chat completion and TTS features.
- **Constructor:**
  - `constructor(apiKey: string)`
- **Responsibilities:**
  - Sends chat completion requests to OpenAI
  - Sends TTS requests to OpenAI
  - Handles API errors and retries

## src/types/types.ts
- **Description:** Contains shared TypeScript types and interfaces used throughout the project.

---

For further details, refer to the source code and inline comments.


