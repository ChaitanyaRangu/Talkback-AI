# Talkback-AI

Talkback-AI is a Node.js-based server application that provides a WebSocket API for real-time chat and text-to-speech (TTS) services, integrating with OpenAI's APIs. It is designed for interactive conversational AI experiences, supporting both chat completion and TTS audio streaming.

## Features
- WebSocket server for real-time chatCompletion to Speech Streaming mode
- Chat completion using OpenAI's GPT models
- Text-to-speech (TTS) audio generation

## Project Structure
```
Talkback-AI/
├── client.html                  # Simple browser client to test WebSocket
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
│   ├── e2e/
│   │   └── openai.e2e.test.ts          # End-to-end test
│   ├── integration/
│   │   └── openai.int.test.ts
│   └── unit/
│       └── openai.unit.test.ts
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
3. Edit the existing `.env` file in the project root with your OpenAI API key:
   ```
   PORT=8000
   OPENAI_API_KEY=your_key_here
   ```

### Running the Server
```sh
npm start
```

### Running Tests
```sh
npm test
```

## Usage
- Start the server (see above).
- Open `client.html` in your browser by double-clicking it (if you change the port in the .env please change it in client.html as well).
- The page will connect to the WebSocket server.
- Type a message and send; you will receive TTS audio.

## Environment Variables
- `PORT`: Port number for the server to listen on (default: 8000)
- `OPENAI_API_KEY`: Your OpenAI API key (required for chat and TTS features)

---
### Architecture Overview

Talkback-AI is structured into four main components that work together to provide real-time conversational AI over WebSockets.

1. **ConnectionManager**  
   Responsible for accepting and managing WebSocket connections.  
   It keeps track of active clients and creates a dedicated **SocketManager** when a new connection is established.

2. **SessionManager**  
   Handles session creation and storage.  
   Whenever a client connects, the ConnectionManager requests a new session from the SessionManager, which generates and maintains session data.

3. **SocketManager**  
   Created per socket connection.  
   It listens to incoming WebSocket events, parses messages from clients, and decides what actions to take (chat, TTS, etc.).  
   When a client sends an AI-related request, the SocketManager forwards it to the **OpenAIService**.

4. **OpenAIService**  
   Wraps all communication with OpenAI's API.  
   It handles:
  - Chat Completion (text responses)
  - Text-to-Speech (TTS) audio generation
  - Streaming Audio Chunks back to the SocketManager

### How They Work Together (Summary)

- A new client connects → **ConnectionManager** accepts it
- A session is created → **SessionManager**
- A socket handler is created → **SocketManager**
- User sends a message → **SocketManager** interprets it
- If AI processing is needed → **SocketManager** calls **OpenAIService**
- OpenAI responds → **SocketManager** streams back Audio Chunks to the client