import { PlaywrightBrowser } from '@midscene/web/playwright';
import { ai } from '@midscene/web';
import { ovhClient } from '../config/ovhcloud.js';
import config from '../config/index.js';

export class MidsceneClient {
  constructor() {
    this.browser = null;
    this.page = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize Playwright browser
      this.browser = await PlaywrightBrowser.create({
        headless: config.browser.headless,
        timeout: config.browser.timeout
      });

      // Create new page
      this.page = await this.browser.newPage();
      
      // Configure Midscene to use OVHcloud AI
      ai.configure({
        aiModel: {
          type: 'custom',
          endpoint: config.ovhcloud.endpointUrl,
          apiKey: config.ovhcloud.apiToken,
          model: config.ovhcloud.model
        }
      });

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
      await ai('wait for login form to be visible', { page: this.page });
      
      // Fill username
      await ai('enter username in the email or username field', { 
        page: this.page,
        params: { username }
      });
      
      // Fill password
      await ai('enter password in the password field', {
        page: this.page,
        params: { password }
      });
      
      // Click login button
      await ai('click the login or sign in button', { page: this.page });
      
      // Wait for successful login
      await ai('wait for dashboard or main page to be visible', { 
        page: this.page,
        timeout: 10000
      });
      
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
      await ai('click on courses or learning paths menu', { page: this.page });
      
      // Search for specific course
      await ai('search for course in search box', {
        page: this.page,
        params: { courseName }
      });
      
      // Click on the course
      await ai('click on the course card or link', {
        page: this.page,
        params: { courseName }
      });
      
      // Wait for course page to load
      await ai('wait for course content to be visible', { 
        page: this.page,
        timeout: 10000
      });
      
      console.log(`Navigated to course: ${courseName}`);
      return { success: true };
    } catch (error) {
      console.error(`Course navigation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async extractCourseMetadata() {
    try {
      const metadata = await ai('extract course information including title, duration, description, and module structure', {
        page: this.page
      });
      
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
          result = await ai('click the play button on the video player', { page: this.page });
          break;
        case 'pause':
          result = await ai('click the pause button on the video player', { page: this.page });
          break;
        case 'seek':
          result = await ai('seek video to specific time position', {
            page: this.page,
            params: { position: params.position }
          });
          break;
        case 'getProgress':
          result = await ai('get current video progress and duration', { page: this.page });
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
      await ai('wait for video frame to be stable and fully loaded', {
        page: this.page,
        timeout
      });
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