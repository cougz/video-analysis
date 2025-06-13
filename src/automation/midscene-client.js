import { PlaywrightAgent, overrideAIConfig } from '@midscene/web/playwright';
import { chromium } from 'playwright';
import { ovhClient } from '../config/ovhcloud.js';
import config from '../config/index.js';

export class MidsceneClient {
  constructor() {
    this.browser = null;
    this.page = null;
    this.agent = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Configure Midscene AI settings before initialization
      overrideAIConfig({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        MIDSCENE_MODEL_NAME: process.env.MIDSCENE_MODEL_NAME
      });

      // Initialize Playwright browser
      this.browser = await chromium.launch({
        headless: config.browser.headless,
        timeout: config.browser.timeout
      });

      // Create new page
      this.page = await this.browser.newPage();
      
      // Initialize PlaywrightAgent
      this.agent = new PlaywrightAgent(this.page);

      this.initialized = true;
      console.log('Midscene client initialized successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Midscene client:', error);
      return { success: false, error: error.message };
    }
  }

  async navigateToUrl(url) {
    if (!this.initialized) {
      throw new Error('Midscene client not initialized');
    }

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });
      console.log(`Navigated to: ${url}`);
      return { success: true };
    } catch (error) {
      console.error(`Navigation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async login(username, password) {
    try {
      // Wait for login page to load
      await this.agent.ai('wait for login form to be visible');
      
      // Fill username
      await this.agent.ai(`enter "${username}" in the email or username field`);
      
      // Fill password
      await this.agent.ai(`enter "${password}" in the password field`);
      
      // Click login button
      await this.agent.ai('click the login or sign in button');
      
      // Wait for successful login
      await this.agent.ai('wait for dashboard or main page to be visible');
      
      console.log('Login successful');
      return { success: true };
    } catch (error) {
      console.error(`Login failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async navigateToCourse(courseName) {
    try {
      // Navigate to courses section
      await this.agent.ai('click on courses or learning paths menu');
      
      // Search for specific course
      await this.agent.ai(`search for "${courseName}" in search box`);
      
      // Click on the course
      await this.agent.ai(`click on the course card or link for "${courseName}"`);
      
      // Wait for course page to load
      await this.agent.ai('wait for course content to be visible');
      
      console.log(`Navigated to course: ${courseName}`);
      return { success: true };
    } catch (error) {
      console.error(`Course navigation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async extractCourseMetadata() {
    try {
      const metadata = await this.agent.ai('extract course information including title, duration, description, and module structure');
      
      return { success: true, metadata };
    } catch (error) {
      console.error(`Metadata extraction failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async takeScreenshot(options = {}) {
    try {
      const screenshot = await this.page.screenshot({
        quality: config.browser.screenshotQuality,
        type: 'png',
        fullPage: options.fullPage || false
      });
      
      return { success: true, screenshot };
    } catch (error) {
      console.error(`Screenshot failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async controlVideo(action, params = {}) {
    try {
      let result;
      
      switch (action) {
        case 'play':
          result = await this.agent.ai('click the play button on the video player');
          break;
        case 'pause':
          result = await this.agent.ai('click the pause button on the video player');
          break;
        case 'seek':
          result = await this.agent.ai(`seek video to ${params.position} seconds`);
          break;
        case 'getProgress':
          result = await this.agent.ai('get current video progress and duration');
          break;
        default:
          throw new Error(`Unknown video action: ${action}`);
      }
      
      return { success: true, result };
    } catch (error) {
      console.error(`Video control failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async waitForVideoStable(timeout = 2000) {
    try {
      await this.agent.ai('wait for video frame to be stable and fully loaded');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('Midscene client closed');
    } catch (error) {
      console.error('Error closing Midscene client:', error);
    }
  }
}

export default MidsceneClient;