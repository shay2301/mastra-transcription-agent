import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { TranscriberAgent } from './agent/TranscriberAgent.js';
import { OpenRouterClient } from './services/openrouter.js';
import { createTranscribeRouter } from './routes/transcribe.js';
import { createWebSocketServer } from './routes/ws.js';

// Load environment variables
config({ path: '.env.local' });
config(); // fallback to .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
if (!process.env.OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY is required');
  process.exit(1);
}

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(o => o.trim());

// Initialize services
const openRouterClient = new OpenRouterClient(
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_BASE_URL,
  process.env.OPENROUTER_MODEL
);

const agent = new TranscriberAgent(
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_BASE_URL,
  process.env.OPENROUTER_MODEL,
  parseFloat(process.env.MAX_FILE_SIZE_MB || '19.5')
);

// Create Express app
const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// API routes
app.use('/api', createTranscribeRouter(agent));

// Serve static UI files
const uiPath = path.join(__dirname, '../ui');
app.use(express.static(uiPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(uiPath, 'index.html'));
});

// Create WebSocket server
createWebSocketServer(server, agent, openRouterClient);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Mastra Live Transcriber                                       ║
║  Server running on http://${HOST}:${PORT}                    ║
║                                                                ║
║  Endpoints:                                                    ║
║  • POST /api/transcribe  - Upload audio file                  ║
║  • WS   /ws              - Live transcription stream           ║
║  • GET  /api/health      - Health check                        ║
║                                                                ║
║  UI:                                                           ║
║  • /                     - Upload page                         ║
║  • /live                 - Live captions                       ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});
