# Video Learning Platform Analysis System

An automated system that uses Midscene.js to navigate learning platforms and leverages OVHcloud's Qwen2.5-VL model to analyze educational content for quality, technical accuracy, and educational effectiveness.

## 🚀 Features

- **Automated Platform Navigation**: Supports Udemy, Coursera, edX, Pluralsight, LinkedIn Learning, and generic platforms
- **Intelligent Content Capture**: Strategic screenshot capture of video frames, code examples, assessments, and course materials
- **AI-Powered Analysis**: Uses OVHcloud's Qwen2.5-VL model for comprehensive content analysis
- **Multi-Format Reports**: Generates HTML, JSON, and PDF reports with actionable insights
- **Cost-Optimized**: Leverages Qwen2.5-VL for 30-50% token savings compared to GPT-4

## 📋 Prerequisites

- Node.js 18+
- OVHcloud AI Endpoints account and API token
- Learning platform credentials (optional but recommended)

## 🛠️ Installation

1. **Clone and setup the project:**
   ```bash
   git clone <repository-url>
   cd video-analysis
   npm install
   ```

   **Note**: If you encounter missing dependencies (jest, dotenv, etc.), ensure all dependencies are installed:
   ```bash
   npm install jest dotenv @midscene/web@0.19.0 playwright axios fs-extra sharp pdf-lib handlebars node-cron
   npm install --save-dev jest eslint prettier @types/node
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## ⚙️ Configuration

### Required Environment Variables

```bash
# OVHcloud AI Endpoints Configuration
OVH_AI_ENDPOINTS_URL=https://qwen25-vl-72b-instruct.endpoints.kepler.ai.cloud.ovh.net
OVH_AI_TOKEN=your_ovh_ai_token_here

# Learning Platform Credentials (optional)
PLATFORM_USERNAME=your_username
PLATFORM_PASSWORD=your_password
```

### Optional Configuration

```bash
# Browser Configuration
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
SCREENSHOT_QUALITY=80

# Analysis Configuration
CAPTURE_INTERVALS=5
MAX_CONCURRENT_ANALYSES=3
ANALYSIS_TIMEOUT=60000

# Report Configuration
REPORT_FORMAT=html,json,pdf
REPORT_OUTPUT_DIR=./reports
ENABLE_SCREENSHOTS_IN_REPORTS=true
```

## 🎯 Quick Start

### Analyze a Single Course

```bash
npm start "https://udemy.com" "JavaScript Fundamentals"
```

### Programmatic Usage

```javascript
import VideoLearningAnalyzer from './src/index.js';

const analyzer = new VideoLearningAnalyzer();

async function analyzeCourse() {
  // Initialize the analyzer
  await analyzer.initialize();
  
  // Analyze a course
  const result = await analyzer.analyzeCourse(
    'https://coursera.org',
    'Machine Learning Course',
    {
      captureCode: true,
      captureAssessments: true,
      optimizeImages: true
    }
  );
  
  if (result.success) {
    console.log('Analysis completed!');
    console.log('Reports:', result.reports);
  }
  
  // Clean up
  await analyzer.close();
}

analyzeCourse().catch(console.error);
```

## 📊 Analysis Types

The system performs four types of analysis on captured content:

### 1. Technical Accuracy Analysis
- Correctness of presented information
- Accuracy of code examples
- Proper use of terminology
- Conceptual clarity

### 2. Visual Quality Analysis
- Clarity of diagrams and illustrations
- Readability of text and code
- Professional appearance
- Effective use of visual aids

### 3. Educational Value Analysis
- Clear learning objectives
- Logical content progression
- Appropriate examples and exercises
- Student engagement level

### 4. Content Extraction
- Main topics covered
- Key concepts explained
- Code examples identification
- Assessment questions

## 📈 Report Formats

### HTML Report
Interactive web-based report with:
- Executive summary dashboard
- Detailed analysis sections
- Visual metrics and scores
- Embedded screenshots (optional)
- Actionable recommendations

### JSON Report
Machine-readable format containing:
- Raw analysis data
- Structured metrics
- Timestamps and metadata
- API response details

### PDF Report
Printable summary report with:
- Key findings overview
- Critical issues highlight
- Recommendation summary
- Professional formatting

## 🏗️ Architecture

```
src/
├── automation/         # Midscene.js automation
│   └── midscene-client.js
├── analysis/          # AI analysis engine
│   └── vlm-analyzer.js
├── navigation/        # Platform-specific navigation
│   └── platform-navigator.js
├── capture/           # Content capture strategies
│   └── content-capture.js
├── reports/           # Report generation
│   └── report-generator.js
├── config/            # Configuration management
│   ├── index.js
│   └── ovhcloud.js
└── index.js           # Main orchestrator
```

## 🔧 Advanced Usage

### Custom Analysis Options

```javascript
const options = {
  captureCode: true,           // Capture code examples
  captureAssessments: false,   // Skip assessments
  captureFullPage: true,       // Capture full page context
  optimizeImages: true,        // Optimize captured images
  maxConcurrent: 5            // Max concurrent analyses
};

const result = await analyzer.analyzeCourse(url, courseName, options);
```

### Batch Course Analysis

```javascript
const courses = [
  'JavaScript Fundamentals',
  'Advanced React Patterns',
  'Node.js Masterclass'
];

for (const course of courses) {
  const result = await analyzer.analyzeCourse(platformUrl, course);
  console.log(`${course}: ${result.success ? 'Success' : 'Failed'}`);
}
```

### Learning Path Analysis

```javascript
const pathResult = await analyzer.analyzeLearningPath(
  'https://udemy.com',
  'Full Stack Developer Path'
);
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/analyzer.test.js
```

## 📊 Cost Optimization

- **Smart Caching**: Avoid duplicate analyses with intelligent caching
- **Batch Processing**: Optimize API calls through efficient batching
- **Strategic Capture**: Intelligent screenshot selection to minimize API usage
- **Qwen2.5-VL**: 30-50% token savings compared to GPT-4

## 🔒 Security & Privacy

- Credentials stored securely in environment variables
- No sensitive data logged or stored
- Session management for authentication
- Secure API token handling

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```bash
   # Check credentials in .env file
   # Verify platform allows automated login
   # Try manual login to verify credentials
   ```

2. **OVHcloud API Errors**
   ```bash
   # Verify API token is valid
   # Check endpoint URL configuration
   # Monitor rate limiting
   ```

3. **Navigation Issues**
   ```bash
   # Platform UI may have changed
   # Check if course name is exact
   # Verify platform is supported
   ```

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm start <url> <course>

# Run with browser visible
BROWSER_HEADLESS=false npm start <url> <course>
```

## 📈 Performance Metrics

Typical performance for a 1-hour course:
- **Analysis Time**: 5-10 minutes
- **Screenshots**: 15-25 captures
- **API Calls**: 50-100 requests
- **Cost**: ~$0.30-0.50 per course
- **Report Size**: 2-5MB (with screenshots)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the troubleshooting section
- Review the example usage
- Open an issue for bugs or feature requests
- Consult OVHcloud AI documentation for API issues

## 🔮 Roadmap

- [ ] Support for more learning platforms
- [ ] Real-time analysis monitoring
- [ ] Advanced content comparison features
- [ ] Integration with LMS APIs
- [ ] Machine learning model for quality prediction
- [ ] Mobile platform support