import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ContentAgnosticVideoAnalyzer from '../video-analyzer-agnostic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutomatedTestRunner {
  constructor(options = {}) {
    this.testResults = [];
    this.currentTest = null;
    this.settings = {
      browser: {
        headless: true, // Always headless for terminal/container environments
        timeout: 45000,
        screenshotQuality: 80
      },
      analysis: {
        captureIntervals: 10,
        maxConcurrentAnalyses: 1,
        analysisTimeout: 120000,
        frameStrategy: 'summary'
      },
      ai: {
        temperature: 0.1,
        maxTokens: 2000
      },
      capture: {
        enableScreenshots: true,
        screenshotFormat: 'png',
        compressionQuality: 80
      },
      ...options.settings
    };
  }

  // Predefined test scenarios
  getTestScenarios() {
    return [
      {
        id: 'vimeo-cookie-test',
        name: 'Vimeo Cookie Consent Test',
        prompt: 'Go to https://vimeo.com/ and watch the first video you find, then provide a summary of the contents.',
        url: 'https://vimeo.com/',
        expectedOutcome: 'Should handle cookie consent and analyze first video',
        timeout: 180000, // 3 minutes
        category: 'cookie-handling'
      },
      {
        id: 'youtube-basic-test',
        name: 'YouTube Basic Video Analysis',
        prompt: 'Go to https://www.youtube.com/watch?v=dQw4w9WgXcQ and analyze the video content, focusing on the music and visual elements.',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        expectedOutcome: 'Should analyze the Rick Astley music video',
        timeout: 180000,
        category: 'basic-analysis'
      },
      {
        id: 'educational-content-test',
        name: 'Educational Content Analysis',
        prompt: 'Find an educational video about JavaScript programming and summarize the key concepts taught.',
        url: null, // Let AI find the video
        expectedOutcome: 'Should find and analyze educational programming content',
        timeout: 240000, // 4 minutes
        category: 'educational'
      },
      {
        id: 'short-video-test',
        name: 'Short Video Analysis',
        prompt: 'Go to https://www.youtube.com/shorts and analyze a short video, focusing on engagement techniques.',
        url: 'https://www.youtube.com/shorts',
        expectedOutcome: 'Should analyze YouTube Shorts content',
        timeout: 120000, // 2 minutes
        category: 'short-form'
      },
      {
        id: 'cookie-heavy-site-test',
        name: 'Cookie Heavy Site Test',
        prompt: 'Go to https://www.dailymotion.com/ and find a trending video to analyze.',
        url: 'https://www.dailymotion.com/',
        expectedOutcome: 'Should handle multiple cookie dialogs and analyze video',
        timeout: 200000,
        category: 'cookie-handling'
      },
      {
        id: 'technical-video-test',
        name: 'Technical Video Analysis',
        prompt: 'Find a video tutorial about Docker or Kubernetes and extract the main technical steps.',
        url: null,
        expectedOutcome: 'Should identify and summarize technical tutorial steps',
        timeout: 300000, // 5 minutes
        category: 'technical'
      }
    ];
  }

  async runSingleTest(scenario, options = {}) {
    const startTime = Date.now();
    const testId = `${scenario.id}_${Date.now()}`;
    
    console.log(`\n🧪 Starting test: ${scenario.name}`);
    console.log(`📝 Prompt: ${scenario.prompt}`);
    console.log(`🌐 URL: ${scenario.url || 'AI will find'}`);
    
    this.currentTest = {
      id: testId,
      scenario,
      startTime,
      status: 'running',
      logs: [],
      screenshots: [],
      errors: []
    };

    try {
      // Initialize analyzer with test-specific callbacks
      const analyzer = new ContentAgnosticVideoAnalyzer({
        onProgress: (progress, message, screenshot) => {
          this.logTestProgress(progress, message);
          if (screenshot) {
            this.captureTestScreenshot(screenshot, message);
          }
        },
        onScreenshot: (screenshot, action) => {
          this.captureTestScreenshot(screenshot, action);
        },
        onStatus: (status, details) => {
          this.logTestStatus(status, details);
        }
      });

      // Configure analyzer
      await analyzer.configure(this.settings);

      // Set timeout for the test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), scenario.timeout);
      });

      // Run the analysis
      const analysisPromise = analyzer.analyzeFromPrompt(scenario.prompt, scenario.url);
      
      const result = await Promise.race([analysisPromise, timeoutPromise]);

      // Test passed
      const duration = Date.now() - startTime;
      this.currentTest.status = 'passed';
      this.currentTest.duration = duration;
      this.currentTest.result = result;
      this.currentTest.endTime = Date.now();

      console.log(`✅ Test passed: ${scenario.name} (${Math.round(duration/1000)}s)`);
      
      this.testResults.push({ ...this.currentTest });
      return { success: true, result, duration };

    } catch (error) {
      // Test failed
      const duration = Date.now() - startTime;
      this.currentTest.status = 'failed';
      this.currentTest.duration = duration;
      this.currentTest.error = error.message;
      this.currentTest.endTime = Date.now();

      console.log(`❌ Test failed: ${scenario.name} - ${error.message}`);
      
      this.testResults.push({ ...this.currentTest });
      return { success: false, error: error.message, duration };
    }
  }

  async runTestSuite(testIds = null, options = {}) {
    console.log('🚀 Starting Automated Test Suite');
    console.log('================================');
    
    const scenarios = this.getTestScenarios();
    const testsToRun = testIds 
      ? scenarios.filter(s => testIds.includes(s.id))
      : scenarios;

    if (testsToRun.length === 0) {
      console.log('❌ No tests found to run');
      return { success: false, error: 'No tests specified' };
    }

    console.log(`📋 Running ${testsToRun.length} tests`);
    console.log(`⚙️  Settings: headless=${this.settings.browser.headless}, strategy=${this.settings.analysis.frameStrategy}`);

    const suiteStartTime = Date.now();
    const results = [];

    for (const scenario of testsToRun) {
      const result = await this.runSingleTest(scenario, options);
      results.push({
        scenario: scenario.name,
        id: scenario.id,
        category: scenario.category,
        ...result
      });

      // Wait between tests to avoid rate limiting
      if (testsToRun.indexOf(scenario) < testsToRun.length - 1) {
        console.log('⏳ Waiting 30 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    const suiteDuration = Date.now() - suiteStartTime;
    const summary = this.generateTestSummary(results, suiteDuration);
    
    // Save detailed report
    await this.saveTestReport(results, summary);
    
    console.log('\n📊 Test Suite Complete');
    console.log('======================');
    console.log(summary.text);

    return {
      success: summary.passed === results.length,
      results,
      summary,
      duration: suiteDuration
    };
  }

  async runQuickTest(promptOverride = null) {
    console.log('⚡ Running Quick Test');
    
    const quickScenario = {
      id: 'quick-test',
      name: 'Quick Cookie & Video Test',
      prompt: promptOverride || 'Go to https://vimeo.com/ and watch the first video you find, then provide a brief summary.',
      url: 'https://vimeo.com/',
      expectedOutcome: 'Quick validation of cookie handling and basic video analysis',
      timeout: 120000, // 2 minutes
      category: 'quick-validation'
    };

    return await this.runSingleTest(quickScenario);
  }

  logTestProgress(progress, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'progress',
      progress,
      message
    };
    
    this.currentTest.logs.push(logEntry);
    console.log(`📈 ${progress}% - ${message}`);
  }

  logTestStatus(status, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'status',
      status,
      details
    };
    
    this.currentTest.logs.push(logEntry);
    console.log(`🔄 Status: ${status} - ${details}`);
  }

  captureTestScreenshot(screenshot, action) {
    const screenshotEntry = {
      timestamp: new Date().toISOString(),
      action,
      data: screenshot // Base64 data
    };
    
    this.currentTest.screenshots.push(screenshotEntry);
    console.log(`📸 Screenshot: ${action}`);
  }

  generateTestSummary(results, duration) {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const categories = [...new Set(results.map(r => r.category))];
    
    const categoryStats = categories.map(cat => {
      const catResults = results.filter(r => r.category === cat);
      const catPassed = catResults.filter(r => r.success).length;
      return `${cat}: ${catPassed}/${catResults.length}`;
    }).join(', ');

    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;

    const text = `
Total Tests: ${results.length}
Passed: ${passed} ✅
Failed: ${failed} ${failed > 0 ? '❌' : ''}
Success Rate: ${Math.round((passed/results.length) * 100)}%
Categories: ${categoryStats}
Total Duration: ${Math.round(duration/1000)}s
Avg Test Duration: ${Math.round(avgDuration/1000)}s
    `.trim();

    return {
      total: results.length,
      passed,
      failed,
      successRate: Math.round((passed/results.length) * 100),
      duration,
      avgDuration,
      categoryStats,
      text
    };
  }

  async saveTestReport(results, summary) {
    try {
      const reportsDir = path.join(__dirname, '../../test-reports');
      await fs.ensureDir(reportsDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportsDir, `test-report-${timestamp}.json`);
      
      const report = {
        timestamp: new Date().toISOString(),
        summary,
        results,
        settings: this.settings,
        testResults: this.testResults
      };
      
      await fs.writeJSON(reportFile, report, { spaces: 2 });
      console.log(`📄 Test report saved: ${reportFile}`);
      
      return reportFile;
    } catch (error) {
      console.error('Error saving test report:', error);
    }
  }

  // Utility methods for manual testing
  async testCookieHandling() {
    const cookieScenarios = this.getTestScenarios().filter(s => s.category === 'cookie-handling');
    return await this.runTestSuite(cookieScenarios.map(s => s.id));
  }

  async testBasicFunctionality() {
    const basicTests = ['vimeo-cookie-test', 'youtube-basic-test'];
    return await this.runTestSuite(basicTests);
  }

  async testEducationalContent() {
    const eduTests = this.getTestScenarios().filter(s => s.category === 'educational');
    return await this.runTestSuite(eduTests.map(s => s.id));
  }
}

export default AutomatedTestRunner;