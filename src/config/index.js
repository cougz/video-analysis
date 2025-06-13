import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // OVHcloud Configuration
  ovhcloud: {
    endpointUrl: process.env.OVH_AI_ENDPOINTS_URL,
    apiToken: process.env.OVH_AI_TOKEN,
    model: 'Qwen2.5-VL-72B-Instruct'
  },

  // Platform Credentials
  platform: {
    username: process.env.PLATFORM_USERNAME,
    password: process.env.PLATFORM_PASSWORD
  },

  // Browser Configuration
  browser: {
    headless: process.env.BROWSER_HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000,
    screenshotQuality: parseInt(process.env.SCREENSHOT_QUALITY) || 80
  },

  // Analysis Configuration
  analysis: {
    captureIntervals: parseInt(process.env.CAPTURE_INTERVALS) || 5,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_ANALYSES) || 3,
    timeout: parseInt(process.env.ANALYSIS_TIMEOUT) || 60000
  },

  // Report Configuration
  reports: {
    formats: process.env.REPORT_FORMAT?.split(',') || ['html', 'json'],
    outputDir: process.env.REPORT_OUTPUT_DIR || './reports',
    includeScreenshots: process.env.ENABLE_SCREENSHOTS_IN_REPORTS === 'true'
  },

  // Caching
  cache: {
    enabled: process.env.ENABLE_CACHE === 'true',
    duration: parseInt(process.env.CACHE_DURATION) || 86400
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/analyzer.log'
  },

  // Analysis Prompts
  prompts: {
    technicalAccuracy: `Analyze this educational content for:
1. Technical correctness of presented information
2. Accuracy of code examples or demonstrations  
3. Proper use of terminology
4. Conceptual clarity
Identify any errors or misleading information and provide specific feedback.`,

    visualQuality: `Evaluate the visual presentation quality:
1. Clarity of diagrams and illustrations
2. Readability of text and code
3. Professional appearance
4. Effective use of visual aids
Rate the visual quality from 1-10 and suggest specific improvements.`,

    educationalValue: `Assess the educational effectiveness:
1. Clear learning objectives
2. Logical content progression
3. Appropriate examples and exercises
4. Student engagement level
Provide specific feedback on the teaching approach and rate effectiveness 1-10.`,

    contentExtraction: `Extract and summarize the key information from this learning content:
1. Main topics covered
2. Key concepts explained
3. Code examples shown
4. Questions or exercises presented
Provide a structured summary of the educational content.`
  }
};

export default config;