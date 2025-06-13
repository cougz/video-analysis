import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // OVHcloud Configuration - now simplified
  ovhcloud: {
    endpointUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net',
    apiToken: process.env.OVH_AI_TOKEN,
    model: 'Qwen2.5-VL-72B-Instruct'
  },

  // Default settings (overridden by WebUI settings)
  defaults: {
    browser: {
      headless: true,
      timeout: 30000,
      navigationTimeout: 60000,
      screenshotQuality: 80
    },
    analysis: {
      captureIntervals: 5,
      maxConcurrent: 3,
      timeout: 60000,
      frameStrategy: 'comprehensive'
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
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
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