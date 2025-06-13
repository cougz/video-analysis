import dotenv from 'dotenv';
import MidsceneClient from './automation/midscene-client.js';
import PlatformNavigator from './navigation/platform-navigator.js';
import ContentCaptureStrategy from './capture/content-capture.js';
import VLMAnalyzer from './analysis/vlm-analyzer.js';
import ReportGenerator from './reports/report-generator.js';
import { ovhClient } from './config/ovhcloud.js';
import config from './config/index.js';

dotenv.config();

export class VideoLearningAnalyzer {
  constructor() {
    this.midsceneClient = null;
    this.navigator = null;
    this.captureStrategy = null;
    this.analyzer = null;
    this.reportGenerator = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Video Learning Platform Analyzer...');
      
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

      // Initialize other components
      this.navigator = new PlatformNavigator(this.midsceneClient);
      this.captureStrategy = new ContentCaptureStrategy(this.midsceneClient);
      this.analyzer = new VLMAnalyzer();
      this.reportGenerator = new ReportGenerator();
      
      await this.reportGenerator.initialize();
      console.log('✅ Report generator initialized');

      this.initialized = true;
      console.log('🎉 Video Learning Analyzer fully initialized!');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async analyzeCourse(platformUrl, courseName, options = {}) {
    if (!this.initialized) {
      throw new Error('Analyzer not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    console.log(`\n📚 Starting analysis of course: "${courseName}"`);
    console.log(`🌐 Platform URL: ${platformUrl}`);

    try {
      // Step 1: Navigate to platform and authenticate
      console.log('\n📍 Step 1: Platform Navigation and Authentication');
      await this.midsceneClient.navigateToUrl(platformUrl);
      
      const platform = await this.navigator.detectPlatform(platformUrl);
      console.log(`🔍 Detected platform: ${platform}`);

      if (config.platform.username && config.platform.password) {
        console.log('🔐 Authenticating user...');
        const authResult = await this.navigator.authenticateUser(
          config.platform.username, 
          config.platform.password
        );
        
        if (!authResult.success) {
          console.warn('⚠️  Authentication failed, proceeding without login:', authResult.error);
        }
      }

      // Step 2: Navigate to course
      console.log('\n📖 Step 2: Course Navigation');
      const courseResult = await this.navigator.searchAndSelectCourse(courseName);
      if (!courseResult.success) {
        throw new Error(`Failed to navigate to course: ${courseResult.error}`);
      }

      // Step 3: Extract course metadata
      console.log('\n📋 Step 3: Course Structure Analysis');
      const structureResult = await this.navigator.extractCourseStructure();
      let courseStructure = null;
      if (structureResult.success) {
        courseStructure = structureResult.structure;
        console.log(`📊 Course structure: ${courseStructure.modules.length} modules, ${courseStructure.totalLessons} lessons`);
      }

      // Step 4: Navigate to first video
      console.log('\n🎬 Step 4: Video Content Access');
      const videoResult = await this.navigator.navigateToFirstVideo();
      if (!videoResult.success) {
        throw new Error(`Failed to access video content: ${videoResult.error}`);
      }

      // Get video player information
      const playerInfo = await this.navigator.getVideoPlayerInfo();
      console.log(`🎥 Video duration: ${Math.round(playerInfo.playerInfo?.duration || 0)}s`);

      // Step 5: Content capture
      console.log('\n📸 Step 5: Content Capture');
      const captures = await this.performContentCapture(playerInfo.playerInfo, courseName, options);
      
      if (captures.length === 0) {
        throw new Error('No content captured for analysis');
      }

      console.log(`📷 Captured ${captures.length} screenshots for analysis`);

      // Step 6: AI Analysis
      console.log('\n🧠 Step 6: AI-Powered Analysis');
      const analysisResults = await this.analyzer.performComprehensiveAnalysis(captures);
      
      // Step 7: Report Generation
      console.log('\n📄 Step 7: Report Generation');
      const reportResult = await this.reportGenerator.generateReport(
        analysisResults,
        courseName,
        platform
      );

      // Step 8: Cleanup
      console.log('\n🧹 Step 8: Cleanup');
      await this.captureStrategy.cleanup();

      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ Analysis completed in ${totalTime}s`);
      
      if (reportResult.success) {
        console.log('📊 Generated reports:');
        reportResult.reports.forEach(report => {
          console.log(`   📁 ${report.format.toUpperCase()}: ${report.path} (${report.size}KB)`);
        });
      }

      return {
        success: true,
        courseName,
        platform,
        courseStructure,
        analysisResults,
        reports: reportResult.reports,
        statistics: {
          totalTime,
          capturesAnalyzed: captures.length,
          reportsGenerated: reportResult.reports.length
        }
      };

    } catch (error) {
      console.error('❌ Course analysis failed:', error.message);
      
      // Cleanup on error
      try {
        await this.captureStrategy.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError.message);
      }
      
      return {
        success: false,
        error: error.message,
        courseName,
        platform: this.navigator?.currentPlatform
      };
    }
  }

  async performContentCapture(playerInfo, courseName, options) {
    const allCaptures = [];
    
    // Capture video frames if video is available
    if (playerInfo && playerInfo.duration > 0) {
      console.log('🎬 Capturing video frames...');
      const videoCaptures = await this.captureStrategy.captureVideoFrames(
        playerInfo.duration, 
        courseName
      );
      allCaptures.push(...videoCaptures);
    }
    
    // Capture code examples
    if (options.captureCode !== false) {
      console.log('💻 Capturing code examples...');
      const codeCaptures = await this.captureStrategy.captureCodeExamples();
      allCaptures.push(...codeCaptures);
    }
    
    // Capture assessments/quizzes
    if (options.captureAssessments !== false) {
      console.log('📝 Capturing assessments...');
      const assessmentCaptures = await this.captureStrategy.captureAssessments();
      allCaptures.push(...assessmentCaptures);
    }
    
    // Capture full page for context
    if (options.captureFullPage !== false) {
      console.log('📄 Capturing full page content...');
      const fullPageCapture = await this.captureStrategy.captureFullPageContent();
      if (fullPageCapture) {
        allCaptures.push(fullPageCapture);
      }
    }
    
    // Optimize images
    if (options.optimizeImages !== false && allCaptures.length > 0) {
      console.log('🔧 Optimizing captured images...');
      return await this.captureStrategy.optimizeImages(allCaptures);
    }
    
    return allCaptures;
  }

  async analyzeLearningPath(platformUrl, learningPathName, options = {}) {
    console.log(`\n📚 Starting learning path analysis: "${learningPathName}"`);
    
    const pathResults = {
      success: true,
      learningPathName,
      courses: [],
      overallSummary: {},
      totalTime: 0
    };
    
    try {
      await this.midsceneClient.navigateToUrl(platformUrl);
      
      // Navigate to learning path
      // This would need platform-specific implementation
      console.log('🔍 Extracting courses from learning path...');
      
      // For now, treat as single course - in real implementation,
      // this would extract all courses in the path
      const courseResult = await this.analyzeCourse(platformUrl, learningPathName, options);
      pathResults.courses.push(courseResult);
      
      // Generate path-level summary
      pathResults.overallSummary = this.generatePathSummary(pathResults.courses);
      
      return pathResults;
      
    } catch (error) {
      console.error('❌ Learning path analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        learningPathName
      };
    }
  }

  generatePathSummary(courseResults) {
    const summary = {
      totalCourses: courseResults.length,
      successfulAnalyses: courseResults.filter(c => c.success).length,
      averageScore: 0,
      totalCaptures: 0,
      totalReports: 0
    };
    
    const scores = courseResults
      .filter(c => c.success && c.analysisResults)
      .map(c => {
        // Extract overall scores from analysis results
        return 7; // Placeholder - would calculate from actual analysis
      });
    
    summary.averageScore = scores.length > 0 ? 
      scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    summary.totalCaptures = courseResults.reduce((total, course) => 
      total + (course.statistics?.capturesAnalyzed || 0), 0);
    
    summary.totalReports = courseResults.reduce((total, course) => 
      total + (course.statistics?.reportsGenerated || 0), 0);
    
    return summary;
  }

  async close() {
    console.log('🔄 Shutting down analyzer...');
    
    if (this.midsceneClient) {
      await this.midsceneClient.close();
    }
    
    if (this.captureStrategy) {
      await this.captureStrategy.cleanup();
    }
    
    console.log('✅ Analyzer shutdown complete');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🎓 Video Learning Platform Analyzer

Usage:
  npm start <platform_url> <course_name> [options]

Examples:
  npm start "https://udemy.com" "JavaScript Fundamentals"
  npm start "https://coursera.org" "Machine Learning Course"

Environment Variables:
  OVH_AI_ENDPOINTS_URL - OVHcloud AI endpoint URL
  OVH_AI_TOKEN - OVHcloud AI API token
  PLATFORM_USERNAME - Learning platform username
  PLATFORM_PASSWORD - Learning platform password

For more configuration options, see .env.example
    `);
    process.exit(1);
  }

  const [platformUrl, courseName, ...optionArgs] = args;
  const options = {};
  
  // Parse simple options
  if (optionArgs.includes('--no-code')) options.captureCode = false;
  if (optionArgs.includes('--no-assessments')) options.captureAssessments = false;
  if (optionArgs.includes('--no-optimize')) options.optimizeImages = false;

  const analyzer = new VideoLearningAnalyzer();
  
  try {
    const initResult = await analyzer.initialize();
    if (!initResult.success) {
      console.error('❌ Failed to initialize analyzer:', initResult.error);
      process.exit(1);
    }

    const result = await analyzer.analyzeCourse(platformUrl, courseName, options);
    
    if (result.success) {
      console.log('\n🎉 Analysis completed successfully!');
      console.log(`📊 Overall score: ${result.analysisResults?.summary?.overallScore || 'N/A'}`);
      console.log(`📁 Reports saved to: ${config.reports.outputDir}`);
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

export default VideoLearningAnalyzer;