/**
 * Jest test setup file
 * This file is run before each test suite
 */

import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.OVH_AI_ENDPOINTS_URL = process.env.OVH_AI_ENDPOINTS_URL || 'https://test-endpoint.ovh.net';
process.env.OVH_AI_TOKEN = process.env.OVH_AI_TOKEN || 'test-token';
process.env.BROWSER_HEADLESS = 'true';
process.env.BROWSER_TIMEOUT = '10000';
process.env.ANALYSIS_TIMEOUT = '30000';
process.env.ENABLE_CACHE = 'false';
process.env.LOG_LEVEL = 'error';

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless LOG_LEVEL is debug
  if (process.env.LOG_LEVEL !== 'debug') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test helpers
global.createMockImageData = () => {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

global.createMockAnalysisResult = (score = 8, issues = []) => {
  return {
    success: true,
    analysis: `This content has a quality score of ${score}/10. ${issues.length > 0 ? 'Issues found: ' + issues.join(', ') : 'No major issues found.'}`,
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    }
  };
};

global.createMockCaptureData = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: i * 100,
    filename: `capture_${i}.png`,
    base64: global.createMockImageData(),
    context: 'video_frame'
  }));
};

// Mock Playwright browser for tests
global.mockPlaywrightBrowser = {
  newPage: jest.fn().mockResolvedValue({
    goto: jest.fn().mockResolvedValue(),
    screenshot: jest.fn().mockResolvedValue(Buffer.from(global.createMockImageData(), 'base64')),
    close: jest.fn().mockResolvedValue(),
    $: jest.fn().mockResolvedValue(null),
    $$: jest.fn().mockResolvedValue([]),
    waitForSelector: jest.fn().mockResolvedValue(),
    click: jest.fn().mockResolvedValue(),
    fill: jest.fn().mockResolvedValue(),
    keyboard: {
      press: jest.fn().mockResolvedValue()
    }
  }),
  close: jest.fn().mockResolvedValue()
};

// Setup global error handlers for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);