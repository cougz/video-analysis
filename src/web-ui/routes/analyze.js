import express from 'express';
import ContentAgnosticVideoAnalyzer from '../../video-analyzer-agnostic.js';

const router = express.Router();

// These will be injected when the router is created
let sessionManager = null;

export function setSessionManager(manager) {
  sessionManager = manager;
}

// Start new analysis
router.post('/', async (req, res) => {
  try {
    const { prompt, url, settings = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Create new session
    const session = sessionManager.createSession(prompt, url, settings);
    
    // Start analysis in background
    startAnalysis(session.id, prompt, url, settings);
    
    res.json({ 
      sessionId: session.id,
      status: session.status,
      message: 'Analysis started successfully'
    });
    
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ 
      error: 'Failed to start analysis',
      details: error.message 
    });
  }
});

// Get analysis status
router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    sessionId: session.id,
    status: session.status,
    progress: session.progress,
    error: session.error,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  });
});

// Get analysis results
router.get('/results/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.status !== 'completed' && session.status !== 'failed') {
    return res.status(202).json({ 
      message: 'Analysis still in progress',
      status: session.status,
      progress: session.progress
    });
  }
  
  res.json({
    sessionId: session.id,
    status: session.status,
    results: session.results,
    error: session.error,
    prompt: session.prompt,
    url: session.url
  });
});

// Cancel analysis
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.deleteSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // TODO: Actually cancel the running analysis
  
  res.json({ 
    message: 'Analysis cancelled successfully',
    sessionId 
  });
});

// Get all active sessions
router.get('/sessions', (req, res) => {
  const sessions = sessionManager.getAllSessions().map(session => ({
    id: session.id,
    prompt: session.prompt.substring(0, 100) + (session.prompt.length > 100 ? '...' : ''),
    status: session.status,
    progress: session.progress,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  }));
  
  res.json({ sessions });
});

async function startAnalysis(sessionId, prompt, url, settings) {
  try {
    sessionManager.updateSession(sessionId, { 
      status: 'initializing',
      progress: 0 
    });
    
    // Initialize analyzer with WebSocket integration
    const analyzer = new ContentAgnosticVideoAnalyzer({
      onProgress: (progress, message, screenshot) => {
        sessionManager.updateSession(sessionId, { 
          progress,
          status: 'analyzing' 
        });
        
        sessionManager.broadcastToClients(sessionId, {
          type: 'progress',
          sessionId,
          progress,
          message,
          screenshot
        });
      },
      onScreenshot: (screenshot, action) => {
        sessionManager.broadcastToClients(sessionId, {
          type: 'screenshot',
          sessionId,
          screenshot,
          action
        });
      },
      onStatus: (status, details) => {
        sessionManager.updateSession(sessionId, { status });
        
        sessionManager.broadcastToClients(sessionId, {
          type: 'status',
          sessionId,
          status,
          details
        });
      }
    });
    
    // Configure analyzer with provided settings
    await analyzer.configure(settings);
    
    sessionManager.updateSession(sessionId, { 
      status: 'navigating',
      progress: 10 
    });
    
    // Start the analysis
    const results = await analyzer.analyzeFromPrompt(prompt, url);
    
    sessionManager.updateSession(sessionId, { 
      status: 'completed',
      progress: 100,
      results 
    });
    
  } catch (error) {
    console.error(`Analysis failed for session ${sessionId}:`, error);
    
    sessionManager.updateSession(sessionId, { 
      status: 'failed',
      error: error.message 
    });
    
    sessionManager.broadcastToClients(sessionId, {
      type: 'error',
      sessionId,
      error: error.message
    });
  }
}

export default router;