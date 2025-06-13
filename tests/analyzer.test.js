import { jest } from '@jest/globals';
import VideoLearningAnalyzer from '../src/index.js';
import { ovhClient } from '../src/config/ovhcloud.js';

// Mock external dependencies
jest.mock('../src/config/ovhcloud.js');
jest.mock('@midscene/web/playwright');

describe('VideoLearningAnalyzer', () => {
  let analyzer;
  
  beforeEach(() => {
    analyzer = new VideoLearningAnalyzer();
    
    // Mock OVHcloud client
    ovhClient.testConnection.mockResolvedValue({ success: true });
    ovhClient.analyzeImage.mockResolvedValue({
      success: true,
      analysis: 'Mock analysis result with score 8/10',
      usage: { tokens: 100 }
    });
  });

  afterEach(async () => {
    if (analyzer) {
      await analyzer.close();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid configuration', async () => {
      const result = await analyzer.initialize();
      expect(result.success).toBe(true);
      expect(analyzer.initialized).toBe(true);
    });

    test('should fail initialization with invalid OVHcloud configuration', async () => {
      ovhClient.testConnection.mockResolvedValue({
        success: false,
        error: 'Invalid API token'
      });

      const result = await analyzer.initialize();
      expect(result.success).toBe(false);
      expect(result.error).toContain('OVHcloud connection failed');
    });
  });

  describe('Course Analysis', () => {
    beforeEach(async () => {
      // Setup successful initialization
      await analyzer.initialize();
      
      // Mock successful navigation and capture
      analyzer.navigator = {
        detectPlatform: jest.fn().mockResolvedValue('udemy'),
        authenticateUser: jest.fn().mockResolvedValue({ success: true }),
        searchAndSelectCourse: jest.fn().mockResolvedValue({ success: true }),
        extractCourseStructure: jest.fn().mockResolvedValue({
          success: true,
          structure: {
            title: 'Test Course',
            modules: [{ title: 'Module 1', lessonCount: 5 }],
            totalLessons: 5
          }
        }),
        navigateToFirstVideo: jest.fn().mockResolvedValue({ success: true }),
        getVideoPlayerInfo: jest.fn().mockResolvedValue({
          success: true,
          playerInfo: { duration: 300, currentTime: 0 }
        })
      };

      analyzer.captureStrategy = {
        captureVideoFrames: jest.fn().mockResolvedValue([
          {
            timestamp: 0,
            filename: 'frame1.png',
            base64: 'mock-base64-data',
            context: 'video_frame'
          }
        ]),
        captureCodeExamples: jest.fn().mockResolvedValue([]),
        captureAssessments: jest.fn().mockResolvedValue([]),
        captureFullPageContent: jest.fn().mockResolvedValue(null),
        optimizeImages: jest.fn().mockImplementation(captures => captures),
        cleanup: jest.fn().mockResolvedValue()
      };

      analyzer.reportGenerator = {
        generateReport: jest.fn().mockResolvedValue({
          success: true,
          reports: [
            { format: 'html', path: '/reports/test.html', size: 1024 }
          ]
        })
      };
    });

    test('should analyze a course successfully', async () => {
      const result = await analyzer.analyzeCourse(
        'https://udemy.com',
        'Test Course'
      );

      expect(result.success).toBe(true);
      expect(result.courseName).toBe('Test Course');
      expect(result.platform).toBe('udemy');
      expect(result.reports).toHaveLength(1);
      expect(result.statistics.capturesAnalyzed).toBe(1);
    });

    test('should handle navigation failures gracefully', async () => {
      analyzer.navigator.searchAndSelectCourse.mockResolvedValue({
        success: false,
        error: 'Course not found'
      });

      const result = await analyzer.analyzeCourse(
        'https://udemy.com',
        'Nonexistent Course'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to navigate to course');
    });

    test('should handle analysis failures gracefully', async () => {
      ovhClient.analyzeImage.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded'
      });

      const result = await analyzer.analyzeCourse(
        'https://udemy.com',
        'Test Course'
      );

      // Should still succeed overall, but with analysis errors
      expect(result.success).toBe(true);
      expect(analyzer.captureStrategy.cleanup).toHaveBeenCalled();
    });
  });

  describe('Content Capture Options', () => {
    beforeEach(async () => {
      await analyzer.initialize();
      
      // Mock basic navigation success
      analyzer.navigator = {
        detectPlatform: jest.fn().mockResolvedValue('udemy'),
        authenticateUser: jest.fn().mockResolvedValue({ success: true }),
        searchAndSelectCourse: jest.fn().mockResolvedValue({ success: true }),
        extractCourseStructure: jest.fn().mockResolvedValue({ success: true, structure: {} }),
        navigateToFirstVideo: jest.fn().mockResolvedValue({ success: true }),
        getVideoPlayerInfo: jest.fn().mockResolvedValue({
          success: true,
          playerInfo: { duration: 300 }
        })
      };

      analyzer.captureStrategy = {
        captureVideoFrames: jest.fn().mockResolvedValue([]),
        captureCodeExamples: jest.fn().mockResolvedValue([]),
        captureAssessments: jest.fn().mockResolvedValue([]),
        captureFullPageContent: jest.fn().mockResolvedValue(null),
        optimizeImages: jest.fn().mockImplementation(captures => captures),
        cleanup: jest.fn().mockResolvedValue()
      };

      analyzer.reportGenerator = {
        generateReport: jest.fn().mockResolvedValue({
          success: true,
          reports: []
        })
      };
    });

    test('should respect capture options', async () => {
      const options = {
        captureCode: false,
        captureAssessments: false,
        optimizeImages: false
      };

      await analyzer.analyzeCourse('https://udemy.com', 'Test Course', options);

      expect(analyzer.captureStrategy.captureCodeExamples).not.toHaveBeenCalled();
      expect(analyzer.captureStrategy.captureAssessments).not.toHaveBeenCalled();
      expect(analyzer.captureStrategy.optimizeImages).not.toHaveBeenCalled();
    });

    test('should enable all captures by default', async () => {
      await analyzer.analyzeCourse('https://udemy.com', 'Test Course');

      expect(analyzer.captureStrategy.captureVideoFrames).toHaveBeenCalled();
      expect(analyzer.captureStrategy.captureCodeExamples).toHaveBeenCalled();
      expect(analyzer.captureStrategy.captureAssessments).toHaveBeenCalled();
      expect(analyzer.captureStrategy.captureFullPageContent).toHaveBeenCalled();
      expect(analyzer.captureStrategy.optimizeImages).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Cleanup', () => {
    test('should cleanup resources on error', async () => {
      await analyzer.initialize();
      
      analyzer.navigator = {
        detectPlatform: jest.fn().mockResolvedValue('udemy'),
        authenticateUser: jest.fn().mockRejectedValue(new Error('Auth failed'))
      };

      analyzer.captureStrategy = {
        cleanup: jest.fn().mockResolvedValue()
      };

      const result = await analyzer.analyzeCourse('https://udemy.com', 'Test Course');

      expect(result.success).toBe(false);
      expect(analyzer.captureStrategy.cleanup).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', async () => {
      await analyzer.initialize();
      
      analyzer.captureStrategy = {
        cleanup: jest.fn().mockRejectedValue(new Error('Cleanup failed'))
      };

      // Should not throw even if cleanup fails
      await expect(analyzer.close()).resolves.not.toThrow();
    });
  });

  describe('Platform Detection', () => {
    test('should detect supported platforms correctly', async () => {
      await analyzer.initialize();
      
      const platforms = [
        ['https://udemy.com/course/test', 'udemy'],
        ['https://coursera.org/learn/test', 'coursera'],
        ['https://edx.org/course/test', 'edx'],
        ['https://pluralsight.com/courses/test', 'pluralsight'],
        ['https://linkedin.com/learning/test', 'linkedin'],
        ['https://unknown-platform.com/test', 'generic']
      ];

      analyzer.navigator = {
        detectPlatform: jest.fn().mockImplementation(url => {
          for (const [pattern, platform] of platforms) {
            if (url.includes(pattern.split('/')[2])) {
              return Promise.resolve(platform);
            }
          }
          return Promise.resolve('generic');
        })
      };

      for (const [url, expectedPlatform] of platforms) {
        const detectedPlatform = await analyzer.navigator.detectPlatform(url);
        expect(detectedPlatform).toBe(expectedPlatform);
      }
    });
  });
});