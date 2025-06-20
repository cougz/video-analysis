import { PlaywrightAgent, overrideAIConfig } from '@midscene/web/playwright';
import { chromium } from 'playwright';

export class MidsceneClient {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.agent = null;
    this.initialized = false;
    
    // WebUI integration callbacks
    this.onProgress = options.onProgress || (() => {});
    this.onScreenshot = options.onScreenshot || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.settings = options.settings || {};
  }

  async initialize() {
    try {
      // Configure Midscene AI settings before initialization
      overrideAIConfig({
        OPENAI_API_KEY: process.env.OVH_AI_TOKEN,
        OPENAI_BASE_URL: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
        MIDSCENE_MODEL_NAME: 'Qwen2.5-VL-72B-Instruct'
      });

      // Use settings from WebUI or defaults
      const browserSettings = this.settings.browser || {};
      
      // Initialize Playwright browser
      this.browser = await chromium.launch({
        headless: browserSettings.headless !== false, // Default to true
        timeout: browserSettings.timeout || 30000
      });

      // Create new page
      this.page = await this.browser.newPage();
      
      // Initialize PlaywrightAgent with timeout settings
      this.agent = new PlaywrightAgent(this.page, {
        waitForNavigationTimeout: 30000, // Increase to 30 seconds
        waitForNetworkIdleTimeout: 15000  // Increase to 15 seconds
      });

      this.initialized = true;
      console.log('Midscene client initialized successfully');
      this.onStatus('initialized', 'Midscene client ready');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Midscene client:', error);
      this.onStatus('error', `Initialization failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleCookieConsent() {
    try {
      this.onStatus('checking', 'Checking for cookie consent dialog');
      
      // Common cookie consent patterns to look for
      const cookiePatterns = [
        'Accept all',
        'Accept All',
        'Accept All Cookies',
        'Accept cookies',
        'Accept',
        'I agree',
        'Agree',
        'OK',
        'Continue',
        'Allow all',
        'Allow All',
        'Agree and continue',
        'Dismiss',
        'Close',
        'Got it',
        'Understood'
      ];
      
      // Try each pattern until one works
      for (const pattern of cookiePatterns) {
        try {
          console.log(`Trying to find and click: "${pattern}"`);
          await this.agent.ai(`look for a button or link with text "${pattern}" and click it if found`, {
            timeout: 3000
          });
          
          // Wait a moment for the dialog to disappear
          await this.page.waitForTimeout(1000);
          
          console.log(`Successfully clicked cookie consent: "${pattern}"`);
          this.onStatus('consent-handled', `Accepted cookies with: ${pattern}`);
          return { success: true, method: pattern };
        } catch (error) {
          // Continue to next pattern if this one fails
          console.log(`Pattern "${pattern}" not found or failed, trying next...`);
          continue;
        }
      }
      
      // If no patterns worked, try generic approach
      try {
        await this.agent.ai('look for any cookie banner, consent dialog, or privacy notice and dismiss it by clicking the most appropriate accept button', {
          timeout: 5000
        });
        console.log('Cookie consent handled with generic approach');
        this.onStatus('consent-handled', 'Cookie consent handled generically');
        return { success: true, method: 'generic' };
      } catch (error) {
        console.log('No cookie consent dialog found or unable to handle it');
        return { success: false, error: 'No cookie consent found' };
      }
    } catch (error) {
      console.error(`Cookie consent handling failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async navigateToUrl(url) {
    if (!this.initialized) {
      throw new Error('Midscene client not initialized');
    }

    try {
      this.onStatus('navigating', `Navigating to ${url}`);
      
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 60000 // Increase timeout to 60 seconds
      });
      console.log(`Navigated to: ${url}`);
      
      // Capture screenshot after navigation
      await this.captureAndBroadcastScreenshot(`Navigated to ${url}`);
      
      // Handle cookie consent automatically
      await this.handleCookieConsent();
      
      // Take another screenshot after cookie handling
      await this.captureAndBroadcastScreenshot(`After cookie consent handling`);
      
      this.onStatus('navigated', `Successfully navigated to ${url}`);
      return { success: true };
    } catch (error) {
      console.error(`Navigation failed: ${error.message}`);
      this.onStatus('error', `Navigation failed: ${error.message}`);
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
      const captureSettings = this.settings.capture || {};
      const browserSettings = this.settings.browser || {};
      
      const screenshotOptions = {
        type: captureSettings.screenshotFormat || 'png',
        fullPage: options.fullPage || false
      };
      
      // Only add quality for JPEG format
      if (screenshotOptions.type === 'jpeg') {
        screenshotOptions.quality = browserSettings.screenshotQuality || 80;
      }
      
      const screenshot = await this.page.screenshot(screenshotOptions);
      
      return { success: true, screenshot };
    } catch (error) {
      console.error(`Screenshot failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async captureAndBroadcastScreenshot(action) {
    try {
      const result = await this.takeScreenshot();
      if (result.success) {
        const base64Screenshot = result.screenshot.toString('base64');
        this.onScreenshot(base64Screenshot, action);
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  }

  async executeUserPrompt(prompt) {
    try {
      this.onStatus('executing', `Executing: ${prompt}`);
      
      // First handle any cookie consent that might appear
      await this.handleCookieConsent();
      
      // Execute the user's prompt
      const result = await this.agent.ai(prompt);
      
      // Capture screenshot after execution
      await this.captureAndBroadcastScreenshot(`Executed: ${prompt}`);
      
      this.onStatus('completed', `Completed: ${prompt}`);
      return { success: true, result };
    } catch (error) {
      console.error(`Prompt execution failed: ${error.message}`);
      this.onStatus('error', `Execution failed: ${error.message}`);
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

  async waitForVideoStable(_timeout = 2000) {
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