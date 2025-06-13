import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default settings
const defaultSettings = {
  browser: {
    headless: true,
    timeout: 30000,
    screenshotQuality: 80
  },
  analysis: {
    captureIntervals: 5,
    maxConcurrentAnalyses: 3,
    analysisTimeout: 60000,
    frameStrategy: 'comprehensive' // comprehensive, summary, timeline
  },
  ai: {
    temperature: 0.1,
    maxTokens: 2000,
    model: 'Qwen2.5-VL-72B-Instruct'
  },
  capture: {
    enableScreenshots: true,
    screenshotFormat: 'png',
    compressionQuality: 80
  }
};

const settingsFile = path.join(__dirname, '../../../settings.json');

// Load settings from file or use defaults
async function loadSettings() {
  try {
    if (await fs.pathExists(settingsFile)) {
      const saved = await fs.readJson(settingsFile);
      return { ...defaultSettings, ...saved };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

// Save settings to file
async function saveSettings(settings) {
  try {
    await fs.ensureDir(path.dirname(settingsFile));
    await fs.writeJson(settingsFile, settings, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Get current settings
router.get('/', async (req, res) => {
  try {
    const settings = await loadSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ 
      error: 'Failed to load settings',
      details: error.message 
    });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    const currentSettings = await loadSettings();
    const newSettings = { ...currentSettings, ...req.body };
    
    // Validate settings
    const validation = validateSettings(newSettings);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid settings',
        details: validation.errors 
      });
    }
    
    const saved = await saveSettings(newSettings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
    
    res.json({ 
      message: 'Settings updated successfully',
      settings: newSettings 
    });
    
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      details: error.message 
    });
  }
});

// Reset settings to defaults
router.post('/reset', async (req, res) => {
  try {
    const saved = await saveSettings(defaultSettings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to reset settings' });
    }
    
    res.json({ 
      message: 'Settings reset to defaults',
      settings: defaultSettings 
    });
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ 
      error: 'Failed to reset settings',
      details: error.message 
    });
  }
});

// Get available options for dropdowns
router.get('/options', (req, res) => {
  res.json({
    frameStrategies: [
      { value: 'comprehensive', label: 'Comprehensive - Capture many frames for detailed analysis' },
      { value: 'summary', label: 'Summary - Capture key moments only' },
      { value: 'timeline', label: 'Timeline - Capture at regular intervals' }
    ],
    screenshotFormats: [
      { value: 'png', label: 'PNG - High quality, larger files' },
      { value: 'jpeg', label: 'JPEG - Smaller files, good quality' }
    ],
    aiModels: [
      { value: 'Qwen2.5-VL-72B-Instruct', label: 'Qwen2.5-VL-72B-Instruct (OVH)' }
    ]
  });
});

function validateSettings(settings) {
  const errors = [];
  
  // Validate browser settings
  if (settings.browser) {
    if (typeof settings.browser.headless !== 'boolean') {
      errors.push('browser.headless must be a boolean');
    }
    if (typeof settings.browser.timeout !== 'number' || settings.browser.timeout < 5000) {
      errors.push('browser.timeout must be a number >= 5000');
    }
    if (typeof settings.browser.screenshotQuality !== 'number' || 
        settings.browser.screenshotQuality < 1 || 
        settings.browser.screenshotQuality > 100) {
      errors.push('browser.screenshotQuality must be between 1 and 100');
    }
  }
  
  // Validate analysis settings
  if (settings.analysis) {
    if (typeof settings.analysis.captureIntervals !== 'number' || settings.analysis.captureIntervals < 1) {
      errors.push('analysis.captureIntervals must be a number >= 1');
    }
    if (typeof settings.analysis.maxConcurrentAnalyses !== 'number' || settings.analysis.maxConcurrentAnalyses < 1) {
      errors.push('analysis.maxConcurrentAnalyses must be a number >= 1');
    }
    if (typeof settings.analysis.analysisTimeout !== 'number' || settings.analysis.analysisTimeout < 10000) {
      errors.push('analysis.analysisTimeout must be a number >= 10000');
    }
    if (!['comprehensive', 'summary', 'timeline'].includes(settings.analysis.frameStrategy)) {
      errors.push('analysis.frameStrategy must be one of: comprehensive, summary, timeline');
    }
  }
  
  // Validate AI settings
  if (settings.ai) {
    if (typeof settings.ai.temperature !== 'number' || 
        settings.ai.temperature < 0 || 
        settings.ai.temperature > 2) {
      errors.push('ai.temperature must be between 0 and 2');
    }
    if (typeof settings.ai.maxTokens !== 'number' || settings.ai.maxTokens < 100) {
      errors.push('ai.maxTokens must be a number >= 100');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default router;