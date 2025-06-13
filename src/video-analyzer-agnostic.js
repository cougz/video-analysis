import dotenv from 'dotenv';
import MidsceneClient from './automation/midscene-client.js';
import UniversalNavigator from './navigation/universal-navigator.js';
import UniversalVideoHandler from './player/universal-video-handler.js';
import AdaptiveCaptureStrategy from './capture/adaptive-capture-strategy.js';
import DynamicAnalyzer from './analysis/dynamic-analyzer.js';
import UniversalOutputGenerator from './output/universal-output-generator.js';
import { ovhClient } from './config/ovhcloud.js';
import config from './config/index.js';

dotenv.config();

export class ContentAgnosticVideoAnalyzer {
  constructor() {
    this.midsceneClient = null;
    this.navigator = null;
    this.videoHandler = null;
    this.captureStrategy = null;
    this.analyzer = null;
    this.outputGenerator = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Content-Agnostic Video Analyzer...');
      
      // Test OVHcloud connection first
      console.log('🔗 Testing OVHcloud AI connection...');
      const connectionTest = await ovhClient.testConnection();
      if (!connectionTest.success) {
        throw new Error(`OVHcloud connection failed: ${connectionTest.error}`);
      }
      console.log('✅ OVHcloud AI connection successful');

      // Initialize Midscene client
      console.log('🤖 Initializing Midscene automation client...');
      this.midsceneClient = new MidsceneClient();
      const midsceneInit = await this.midsceneClient.initialize();
      if (!midsceneInit.success) {
        throw new Error(`Midscene initialization failed: ${midsceneInit.error}`);
      }
      console.log('✅ Midscene client initialized');

      // Initialize content-agnostic components
      this.navigator = new UniversalNavigator(this.midsceneClient);
      this.videoHandler = new UniversalVideoHandler(this.midsceneClient);
      this.captureStrategy = new AdaptiveCaptureStrategy(this.midsceneClient);
      this.analyzer = new DynamicAnalyzer();
      this.outputGenerator = new UniversalOutputGenerator();
      
      await this.outputGenerator.ensureOutputDir();
      console.log('✅ Universal output generator initialized');

      this.initialized = true;
      console.log('🎉 Content-Agnostic Video Analyzer fully initialized!');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async analyze(userPrompt) {
    if (!this.initialized) {
      throw new Error('Analyzer not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    console.log(`\n🎯 Starting content-agnostic analysis for: "${userPrompt}"`);

    try {
      // Step 1: Universal Navigation
      console.log('\n🧭 Step 1: Universal Navigation');
      const navigationResult = await this.navigator.navigateToVideo(userPrompt);
      
      if (!navigationResult.success) {
        throw new Error(`Navigation failed: ${navigationResult.error}`);
      }
      
      console.log('✅ Successfully navigated to video content');

      // Step 2: Universal Video Detection and Control
      console.log('\n🎥 Step 2: Universal Video Player Detection');
      const videoControls = await this.videoHandler.detectAndControlVideo();
      
      if (!videoControls) {
        throw new Error('Failed to detect and initialize video player controls');
      }
      
      // Get video information
      const videoInfo = await this.getVideoInformation(videoControls);
      console.log(`📊 Video detected: ${videoInfo.duration ? Math.round(videoInfo.duration) + 's' : 'unknown duration'}`);

      // Step 3: Adaptive Content Capture
      console.log('\n📸 Step 3: Intelligent Content Capture');
      const captureResult = await this.performAdaptiveCapture(videoControls, videoInfo, userPrompt);
      
      if (captureResult.frames.length === 0) {
        throw new Error('No content captured for analysis');
      }

      console.log(`📷 Captured ${captureResult.frames.length} frames using ${captureResult.strategy} strategy`);

      // Step 4: Dynamic AI Analysis
      console.log('\n🧠 Step 4: Dynamic AI Analysis');
      const analysisResults = await this.analyzer.analyzeContent(userPrompt, captureResult.frames);
      
      if (!analysisResults.success) {
        throw new Error(`Analysis failed: ${analysisResults.error}`);
      }

      // Step 5: Universal Output Generation
      console.log('\n📄 Step 5: Universal Output Generation');
      const outputResult = await this.outputGenerator.generateOutput(
        analysisResults,
        userPrompt,
        'auto' // Let the system determine the best format
      );

      if (!outputResult.success) {
        throw new Error(`Output generation failed: ${outputResult.error}`);
      }

      // Step 6: Cleanup
      console.log('\n🧹 Step 6: Cleanup');
      await this.captureStrategy.cleanup();

      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ Analysis completed in ${totalTime}s`);
      
      console.log('📊 Generated output:');
      outputResult.files.forEach(file => {
        console.log(`   📁 ${file.format.toUpperCase()}: ${file.filename} (${file.size}KB)`);
      });

      return {
        success: true,
        userPrompt,
        analysisResults,
        output: outputResult,
        videoInfo,
        captureStats: captureResult.stats,
        statistics: {
          totalTime,
          framesAnalyzed: captureResult.frames.length,
          outputFiles: outputResult.files.length,
          analysisType: analysisResults.synthesizedResult?.synthesisType || 'unknown'
        }
      };

    } catch (error) {
      console.error('❌ Content-agnostic analysis failed:', error.message);
      
      // Cleanup on error
      try {
        await this.captureStrategy.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError.message);
      }
      
      return {
        success: false,
        error: error.message,
        userPrompt
      };
    }
  }

  async getVideoInformation(videoControls) {
    try {
      const [durationResult, currentTimeResult, playingStatus] = await Promise.all([
        videoControls.getDuration(),
        videoControls.getCurrentTime(),
        videoControls.isPlaying()
      ]);

      return {
        duration: durationResult.success ? durationResult.duration : null,
        currentTime: currentTimeResult.success ? currentTimeResult.currentTime : null,
        isPlaying: playingStatus.success ? playingStatus.isPlaying : false,
        playerInfo: videoControls.getPlayerInfo()
      };
    } catch (error) {
      console.error('❌ Failed to get video information:', error.message);
      return { duration: null, currentTime: null, isPlaying: false };
    }
  }

  async performAdaptiveCapture(videoControls, videoInfo, userPrompt) {
    try {
      // Create intelligent capture plan based on user's request
      const capturePlan = await this.captureStrategy.determineCapturePlan(videoInfo, userPrompt);
      
      // Execute adaptive frame capture
      const frames = await this.captureStrategy.captureFrames(videoControls, capturePlan, userPrompt);
      
      // Optimize captured frames based on strategy
      const optimizedFrames = await this.captureStrategy.optimizeCaptures(frames, capturePlan);
      
      return {
        frames: optimizedFrames,
        strategy: capturePlan.strategy,
        stats: this.captureStrategy.getCaptureStats()
      };
      
    } catch (error) {
      console.error('❌ Adaptive capture failed:', error.message);
      throw error;
    }
  }

  async analyzeFromURL(url, userPrompt) {
    console.log(`\n🌐 Direct URL analysis: ${url}`);
    console.log(`📝 Analysis request: "${userPrompt}"`);
    
    try {
      // Navigate directly to the URL
      await this.midsceneClient.navigateToUrl(url);
      console.log(`✅ Navigated to: ${url}`);
      
      // Continue with standard analysis flow
      return await this.analyze(userPrompt);
      
    } catch (error) {
      console.error('❌ URL analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        url,
        userPrompt
      };
    }
  }

  async analyzeMultipleVideos(videoRequests) {
    console.log(`\n📚 Batch analysis of ${videoRequests.length} videos`);
    
    const results = [];
    
    for (let i = 0; i < videoRequests.length; i++) {
      const request = videoRequests[i];
      console.log(`\n🎯 Processing video ${i + 1}/${videoRequests.length}: "${request.prompt}"`);
      
      try {
        let result;
        if (request.url) {
          result = await this.analyzeFromURL(request.url, request.prompt);
        } else {
          result = await this.analyze(request.prompt);
        }
        
        results.push({
          index: i + 1,
          request,
          result
        });
        
      } catch (error) {
        console.error(`❌ Video ${i + 1} analysis failed:`, error.message);
        results.push({
          index: i + 1,
          request,
          result: { success: false, error: error.message }
        });
      }
    }
    
    // Generate batch summary
    const batchSummary = this.generateBatchSummary(results);
    
    console.log('\n📊 Batch Analysis Complete:');
    console.log(`✅ Successful: ${batchSummary.successful}/${batchSummary.total}`);
    console.log(`❌ Failed: ${batchSummary.failed}/${batchSummary.total}`);
    
    return {
      success: true,
      results,
      summary: batchSummary
    };
  }

  generateBatchSummary(results) {
    const total = results.length;
    const successful = results.filter(r => r.result.success).length;
    const failed = total - successful;
    
    return {
      total,
      successful,
      failed,
      successRate: Math.round((successful / total) * 100),
      totalTime: results.reduce((sum, r) => 
        sum + (r.result.statistics?.totalTime || 0), 0),
      totalFrames: results.reduce((sum, r) => 
        sum + (r.result.statistics?.framesAnalyzed || 0), 0)
    };
  }

  async close() {
    console.log('🔄 Shutting down content-agnostic analyzer...');
    
    if (this.midsceneClient) {
      await this.midsceneClient.close();
    }
    
    if (this.captureStrategy) {
      await this.captureStrategy.cleanup();
    }
    
    if (this.analyzer) {
      this.analyzer.clearCache();
    }
    
    console.log('✅ Content-agnostic analyzer shutdown complete');
  }
}

// CLI Interface for Content-Agnostic Analysis
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
🎓 Content-Agnostic Video Analysis Platform

Usage:
  npm start "<analysis_request>"
  npm start --url "<video_url>" "<analysis_request>"

Examples:
  npm start "Go to YouTube and summarize the latest JavaScript tutorial"
  npm start "Find a Python course on Coursera and extract all code examples"
  npm start "Navigate to Khan Academy and analyze their calculus teaching methods"
  npm start --url "https://youtube.com/watch?v=xyz" "Extract all mentioned frameworks and libraries"

Environment Variables:
  OVH_AI_ENDPOINTS_URL - OVHcloud AI endpoint URL
  OVH_AI_TOKEN - OVHcloud AI API token

Features:
  ✅ Works with ANY website - no hardcoded platforms
  ✅ Accepts ANY analysis request in natural language
  ✅ Adapts to ANY video player type automatically
  ✅ Generates output in appropriate format based on request
  ✅ Intelligent frame capture based on content and request type

For configuration options, see .env.example
    `);
    process.exit(1);
  }

  const analyzer = new ContentAgnosticVideoAnalyzer();
  
  try {
    const initResult = await analyzer.initialize();
    if (!initResult.success) {
      console.error('❌ Failed to initialize analyzer:', initResult.error);
      process.exit(1);
    }

    let result;
    
    if (args[0] === '--url' && args.length >= 3) {
      // Direct URL analysis
      const url = args[1];
      const prompt = args[2];
      result = await analyzer.analyzeFromURL(url, prompt);
    } else {
      // Natural language navigation and analysis
      const prompt = args[0];
      result = await analyzer.analyze(prompt);
    }
    
    if (result.success) {
      console.log('\n🎉 Analysis completed successfully!');
      console.log(`📊 Analysis type: ${result.statistics?.analysisType || 'Unknown'}`);
      console.log(`📁 Output files: ${result.statistics?.outputFiles || 0}`);
      console.log(`📷 Frames analyzed: ${result.statistics?.framesAnalyzed || 0}`);
      console.log(`⏱️  Total time: ${result.statistics?.totalTime || 0}s`);
    } else {
      console.error('❌ Analysis failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await analyzer.close();
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ContentAgnosticVideoAnalyzer;