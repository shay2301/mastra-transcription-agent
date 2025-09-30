import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { TranscriberAgent } from '../agent/TranscriberAgent.js';
import { OpenRouterClient } from '../services/openrouter.js';
import { AudioProcessor } from '../services/audio.js';
import fs from 'fs';
import path from 'path';

interface ClientSession {
  ws: WebSocket;
  sessionId: string;
  language: string;
  audioBuffer: Buffer[];
  bufferSize: number;
  lastTranscriptTime: number;
  partialBuffer: string[];
  finalSegments: Array<{ text: string; tsStart: number; tsEnd: number }>;
  sessionStart: number;
}

export function createWebSocketServer(
  server: Server,
  agent: TranscriberAgent,
  openRouter: OpenRouterClient
): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const sessions = new Map<string, ClientSession>();

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('[WS] Client connected');

    let session: ClientSession | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'start':
            session = handleStart(ws, message, sessions, agent);
            break;

          case 'audio':
            if (session) {
              await handleAudio(session, message, openRouter, agent);
            } else {
              ws.send(JSON.stringify({ type: 'error', error: 'Session not started' }));
            }
            break;

          case 'stop':
            if (session) {
              await handleStop(session, agent);
              sessions.delete(session.sessionId);
              session = null;
            }
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
        }
      } catch (error: any) {
        console.error('[WS] Message handling error:', error);
        ws.send(JSON.stringify({ type: 'error', error: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      if (session) {
        sessions.delete(session.sessionId);
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });
  });

  return wss;
}

function handleStart(
  ws: WebSocket,
  message: any,
  sessions: Map<string, ClientSession>,
  agent: TranscriberAgent
): ClientSession {
  const { sessionId, language = 'auto' } = message;

  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  console.log(`[WS] Starting session: ${sessionId}`);

  const session: ClientSession = {
    ws,
    sessionId,
    language,
    audioBuffer: [],
    bufferSize: 0,
    lastTranscriptTime: Date.now(),
    partialBuffer: [],
    finalSegments: [],
    sessionStart: Date.now(),
  };

  sessions.set(sessionId, session);

  // Initialize session in agent
  agent.startLiveSession(sessionId, language);

  ws.send(
    JSON.stringify({
      type: 'started',
      sessionId,
      language,
    })
  );

  return session;
}

async function handleAudio(
  session: ClientSession,
  message: any,
  openRouter: OpenRouterClient,
  agent: TranscriberAgent
): Promise<void> {
  const { chunk } = message;

  if (!chunk) {
    throw new Error('chunk is required');
  }

  // Decode audio chunk (base64 or raw)
  const buffer = typeof chunk === 'string' ? Buffer.from(chunk, 'base64') : Buffer.from(chunk);

  session.audioBuffer.push(buffer);
  session.bufferSize += buffer.length;

  // Process when we have ~1 second of audio (16kHz * 2 bytes * 1s = 32000 bytes)
  const targetBufferSize = 32000;

  if (session.bufferSize >= targetBufferSize) {
    const audioData = Buffer.concat(session.audioBuffer);
    session.audioBuffer = [];
    session.bufferSize = 0;

    // Convert PCM to WAV for Whisper
    const audioProcessor = new AudioProcessor();
    let wavBuffer: Buffer;

    try {
      wavBuffer = await audioProcessor.bufferToWav(audioData, 16000, 1);
    } catch (error) {
      console.error('[WS] Failed to convert audio to WAV:', error);
      return;
    }

    // Transcribe
    try {
      const currentTime = (Date.now() - session.sessionStart) / 1000;

      const result = await openRouter.transcribeBuffer(
        wavBuffer,
        `live_${session.sessionId}_${Date.now()}.wav`,
        {
          language: session.language === 'auto' ? undefined : session.language,
          responseFormat: 'verbose_json',
          timestampGranularities: ['segment'],
        }
      );

      const text = result.text.trim();

      if (text) {
        // Add to partial buffer
        session.partialBuffer.push(text);

        // Send partial result
        session.ws.send(
          JSON.stringify({
            type: 'partial',
            text,
            tsStart: currentTime - 1,
            tsEnd: currentTime,
          })
        );

        // Log to session file
        logSessionEvent(agent, session.sessionId, {
          type: 'partial',
          text,
          tsStart: currentTime - 1,
          tsEnd: currentTime,
          timestamp: new Date().toISOString(),
        });

        // After 3-5 partials or 700ms pause, emit final
        const timeSinceLastTranscript = Date.now() - session.lastTranscriptTime;

        if (session.partialBuffer.length >= 3 || timeSinceLastTranscript > 700) {
          const finalText = session.partialBuffer.join(' ');
          const finalSegment = {
            text: finalText,
            tsStart: currentTime - session.partialBuffer.length,
            tsEnd: currentTime,
          };

          session.finalSegments.push(finalSegment);
          session.partialBuffer = [];

          // Send final result
          session.ws.send(
            JSON.stringify({
              type: 'final',
              ...finalSegment,
            })
          );

          // Log to session file
          logSessionEvent(agent, session.sessionId, {
            type: 'final',
            ...finalSegment,
            timestamp: new Date().toISOString(),
          });

          // Update agent session
          const agentSession = agent.getLiveSession(session.sessionId);
          if (agentSession) {
            agentSession.finalSegments.push({
              start: finalSegment.tsStart,
              end: finalSegment.tsEnd,
              text: finalSegment.text,
            });
          }
        }

        session.lastTranscriptTime = Date.now();
      }
    } catch (error) {
      console.error('[WS] Transcription error:', error);
      session.ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Transcription failed',
        })
      );
    }
  }
}

async function handleStop(session: ClientSession, agent: TranscriberAgent): Promise<void> {
  console.log(`[WS] Stopping session: ${session.sessionId}`);

  try {
    const result = await agent.finalizeSession(session.sessionId);

    session.ws.send(
      JSON.stringify({
        type: 'stopped',
        sessionId: session.sessionId,
        finalTranscript: result.text,
        vtt: result.vtt,
      })
    );
  } catch (error: any) {
    console.error('[WS] Failed to finalize session:', error);
    session.ws.send(
      JSON.stringify({
        type: 'error',
        error: error.message,
      })
    );
  }
}

function logSessionEvent(agent: TranscriberAgent, sessionId: string, event: any): void {
  try {
    const dataDir = process.env.DATA_DIR || './data';
    const sessionDir = path.join(dataDir, 'sessions');

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const sessionFile = path.join(sessionDir, `${sessionId}.jsonl`);
    fs.appendFileSync(sessionFile, JSON.stringify(event) + '\n');
  } catch (error) {
    console.error('[WS] Failed to log session event:', error);
  }
}
