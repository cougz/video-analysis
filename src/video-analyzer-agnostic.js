import dotenv from 'dotenv';
import MidsceneClient from './automation/midscene-client.js';
import UniversalNavigator from './navigation/universal-navigator.js';
import UniversalVideoHandler from './player/universal-video-handler.js';
import AdaptiveCaptureStrategy from './capture/adaptive-capture-strategy.js';
import DynamicAnalyzer from './analysis/dynamic-analyzer.js';
import UniversalOutputGenerator from './output/universal-output-generator.js';
import { ovhClient } from './config/ovhcloud.js';

dotenv.config();

export class ContentAgnosticVideoAnalyzer {
  constructor(options = {}) {
    this.midsceneClient = null;
    this.navigator = null;
    this.videoHandler = null;
    this.captureStrategy = null;
    this.analyzer = null;
    this.outputGenerator = null;
    this.initialized = false;
    
    // WebUI integration callbacks
    this.onProgress = options.onProgress || (() => {});
    this.onScreenshot = options.onScreenshot || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.settings = {};
  }

  async configure(settings = {}) {
    this.settings = {
      browser: {
        headless: true,
        timeout: 30000,
        screenshotQuality: 80,
        ...settings.browser
      },
      analysis: {
        captureIntervals: 5,
        maxConcurrentAnalyses: 3,
        analysisTimeout: 60000,
        frameStrategy: 'comprehensive',
        ...settings.analysis
      },
      ai: {
        temperature: 0.1,
        maxTokens: 2000,
        model: 'Qwen2.5-VL-72B-Instruct',
        ...settings.ai
      },
      capture: {
        enableScreenshots: true,
        screenshotFormat: 'png',
        compressionQuality: 80,
        ...settings.capture
      }
    };
  }

  async initialize() {
    try {
      this.onStatus('initializing', 'Initializing Video Analyzer...');
      this.onProgress(5, 'Testing AI connection...');
      
      // Test OVHcloud connection first
      const connectionTest = await ovhClient.testConnection();
      if (!connectionTest.success) {
        throw new Error(`OVHcloud connection failed: ${connectionTest.error}`);
      }
      
      this.onProgress(15, 'AI connection successful');

      // Initialize Midscene client with WebUI integration
      this.onProgress(25, 'Initializing browser automation...');
      this.midsceneClient = new MidsceneClient({
        onProgress: this.onProgress,
        onScreenshot: this.onScreenshot,
        onStatus: this.onStatus,
        settings: this.settings
      });
      
      const midsceneInit = await this.midsceneClient.initialize();
      if (!midsceneInit.success) {
        throw new Error(`Midscene initialization failed: ${midsceneInit.error}`);
      }
      
      this.onProgress(40, 'Browser automation ready');

      // Initialize content-agnostic components
      this.navigator = new UniversalNavigator(this.midsceneClient);
      this.videoHandler = new UniversalVideoHandler(this.midsceneClient);
      this.captureStrategy = new AdaptiveCaptureStrategy(this.midsceneClient);
      this.analyzer = new DynamicAnalyzer(ovhClient);
      this.outputGenerator = new UniversalOutputGenerator();
      
      await this.outputGenerator.ensureOutputDir();
      
      this.onProgress(60, 'Components initialized');

      this.initialized = true;
      this.onProgress(100, 'Analyzer ready');
      this.onStatus('ready', 'Video Analyzer fully initialized');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      this.onStatus('error', `Initialization failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async analyzeFromPrompt(userPrompt, directUrl = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.onStatus('analyzing', 'Starting analysis...');
    this.onProgress(0, 'Beginning analysis');

    try {
      // Step 1: Navigation
      this.onProgress(10, 'Navigating to video...');
      this.onStatus('navigating', 'Finding and navigating to video');
      
      let navigationResult;
      if (directUrl) {
        // Navigate directly to provided URL
        navigationResult = await this.midsceneClient.navigateToUrl(directUrl);
      } else {
        // Use AI to find and navigate to video
        navigationResult = await this.navigator.navigateToVideo(userPrompt);
      }
      
      if (!navigationResult.success) {
        throw new Error(`Navigation failed: ${navigationResult.error}`);
      }
      
      this.onProgress(25, 'Successfully navigated to video');

      // Step 2: Video Detection and Control
      this.onProgress(30, 'Detecting video player...');
      this.onStatus('detecting', 'Detecting video player controls');
      
      const videoControls = await this.videoHandler.detectAndControlVideo();
      if (!videoControls) {
        throw new Error('Failed to detect and initialize video player controls');
      }
      
      // Get video information
      const videoInfo = await this.getVideoInformation(videoControls);
      this.onProgress(40, `Video detected: ${videoInfo.duration ? Math.round(videoInfo.duration) + 's' : 'unknown duration'}`);

      // Step 3: Content Capture
      this.onProgress(45, 'Starting content capture...');
      this.onStatus('capturing', 'Capturing video content');
      
      const captureResult = await this.performAdaptiveCapture(videoControls, videoInfo, userPrompt);
      
      if (!captureResult.success) {
        throw new Error(`Content capture failed: ${captureResult.error}`);
      }
      
      this.onProgress(70, `Captured ${captureResult.frames?.length || 0} frames`);

      // Step 4: AI Analysis
      this.onProgress(75, 'Analyzing content with AI...');
      this.onStatus('ai_analyzing', 'Running AI analysis on captured content');
      
      const analysisResult = await this.analyzer.analyzeContent(
        captureResult.frames,
        userPrompt,
        {
          videoInfo,
          captureStrategy: this.settings.analysis.frameStrategy,
          aiSettings: this.settings.ai
        }
      );
      
      if (!analysisResult.success) {
        throw new Error(`AI analysis failed: ${analysisResult.error}`);
      }
      
      this.onProgress(90, 'Analysis complete, generating report...');

      // Step 5: Generate Output
      this.onStatus('generating', 'Generating final report');
      
      const outputResult = await this.outputGenerator.generateReport({
        prompt: userPrompt,
        analysis: analysisResult.analysis,
        frames: captureResult.frames,
        videoInfo,
        metadata: {
          analysisTime: Date.now() - startTime,
          strategy: this.settings.analysis.frameStrategy,
          settings: this.settings
        }
      });

      this.onProgress(100, 'Analysis complete!');
      this.onStatus('completed', 'Analysis completed successfully');

      // Clean up
      await this.cleanup();

      return {
        success: true,
        analysis: analysisResult.analysis,
        report: outputResult,
        metadata: {
          duration: Date.now() - startTime,
          framesCaptured: captureResult.frames?.length || 0,
          strategy: this.settings.analysis.frameStrategy
        }
      };

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      this.onStatus('failed', error.message);
      await this.cleanup();
      throw error;
    }
  }

  async getVideoInformation(videoControls) {
    try {
      // Try to get video duration and other metadata
      const duration = await videoControls.getDuration?.() || null;
      const title = await this.midsceneClient.page.title();
      
      return {
        duration,
        title,
        url: this.midsceneClient.page.url(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting video information:', error);
      return {
        duration: null,
        title: 'Unknown',
        url: this.midsceneClient.page.url(),
        timestamp: new Date().toISOString()
      };
    }
  }

  async performAdaptiveCapture(videoControls, videoInfo, userPrompt) {
    try {
      const strategy = this.settings.analysis.frameStrategy;
      const intervals = this.settings.analysis.captureIntervals;
      
      this.onStatus('capturing', `Using ${strategy} capture strategy`);
      
      const frames = [];
      let captureCount = 0;
      
      // Determine capture points based on strategy
      let capturePoints = [];
      
      if (strategy === 'comprehensive' && videoInfo.duration) {
        // Capture every N seconds
        const totalPoints = Math.min(Math.floor(videoInfo.duration / intervals), 20); // Max 20 frames
        capturePoints = Array.from({ length: totalPoints }, (_, i) => i * intervals);
      } else if (strategy === 'summary') {
        // Capture at key points: beginning, middle, end
        capturePoints = videoInfo.duration 
          ? [0, videoInfo.duration * 0.25, videoInfo.duration * 0.5, videoInfo.duration * 0.75, videoInfo.duration * 0.95]
          : [0, 10, 20, 30]; // Fallback for unknown duration
      } else {
        // Timeline strategy - regular intervals
        capturePoints = Array.from({ length: 10 }, (_, i) => i * (videoInfo.duration ? videoInfo.duration / 10 : 6));
      }
      
      // Capture frames
      for (let i = 0; i < capturePoints.length; i++) {
        const position = capturePoints[i];
        
        try {
          this.onProgress(
            45 + (25 * i / capturePoints.length), 
            `Capturing frame ${i + 1}/${capturePoints.length} at ${Math.round(position)}s`
          );
          
          // Seek to position
          await videoControls.seekTo?.(position);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for frame to load
          
          // Capture screenshot
          const screenshot = await this.midsceneClient.takeScreenshot();
          if (screenshot.success) {
            frames.push({
              timestamp: position,
              image: screenshot.screenshot.toString('base64'),
              index: i
            });
            
            // Broadcast frame to WebUI
            this.onScreenshot(screenshot.screenshot.toString('base64'), `Frame ${i + 1} at ${Math.round(position)}s`);
            captureCount++;
          }
          
        } catch (error) {
          console.error(`Error capturing frame at ${position}s:`, error);
          // Continue with next frame
        }
      }
      
      return {
        success: true,
        frames,
        strategy,
        captureCount
      };
      
    } catch (error) {
      console.error('Adaptive capture failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanup() {
    try {
      if (this.midsceneClient) {
        await this.midsceneClient.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export default ContentAgnosticVideoAnalyzer;