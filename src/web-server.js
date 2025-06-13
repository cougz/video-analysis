import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Import routes
import analyzeRoutes, { setSessionManager } from './web-ui/routes/analyze.js';
import settingsRoutes from './web-ui/routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8081;

// Store active analysis sessions
const activeSessions = new Map();
const wsClients = new Map();

// Session Manager Class
class SessionManager {
  constructor() {
    this.sessions = activeSessions;
    this.clients = wsClients;
  }

  createSession(prompt, url, settings) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      prompt,
      url,
      settings,
      status: 'initializing',
      progress: 0,
      results: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { updatedAt: new Date() });
      this.sessions.set(sessionId, session);
      
      // Broadcast update to WebSocket clients
      this.broadcastToClients(sessionId, {
        type: 'session_update',
        sessionId,
        ...updates
      });
    }
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.broadcastToClients(sessionId, {
        type: 'session_deleted',
        sessionId
      });
    }
    return session;
  }

  broadcastToClients(sessionId, data) {
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === ws.OPEN && (!sessionId || ws.sessionId === sessionId)) {
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          console.error(`Error sending to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    });
  }
}

const sessionManager = new SessionManager();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'web-ui/public')));

// Inject session manager into routes
setSessionManager(sessionManager);

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sessions: activeSessions.size,
    clients: wsClients.size
  });
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  wsClients.set(clientId, ws);
  
  console.log(`WebSocket client connected: ${clientId}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Message from ${clientId}:`, data);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        case 'subscribe':
          // Subscribe to specific analysis session
          if (data.sessionId) {
            ws.sessionId = data.sessionId;
          }
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket client disconnected: ${clientId}`);
    wsClients.delete(clientId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    wsClients.delete(clientId);
  });
});


// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Video Analyzer WebUI Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`🔍 Open http://localhost:${PORT} in your browser to get started`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, wss, activeSessions, wsClients };