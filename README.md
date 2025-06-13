# Video Analyzer - AI-Powered Video Analysis

A modern web application that uses AI to analyze videos through intelligent browser automation. Built with OVHcloud AI (Qwen2.5-VL-72B-Instruct) and Midscene.js for real-time web scraping.

## Features

- 🎯 **Natural Language Prompts**: Simply describe what you want to analyze
- 🤖 **AI-Powered Navigation**: Automatically finds and navigates to videos
- 📺 **Real-time Automation Viewer**: Watch the AI work in real-time
- ⚙️ **Configurable Settings**: Customize browser, analysis, and AI parameters
- 🔗 **WebSocket Live Updates**: Real-time progress and screenshot streaming
- 📊 **Comprehensive Analysis**: Multiple capture strategies and detailed reports

## Quick Start

### Prerequisites

- Node.js 18+
- OVHcloud AI API token

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd video-analysis
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OVH_AI_TOKEN
   ```

3. **Start the application:**
   ```bash
   npm run web-server
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### Basic Analysis

1. Enter a natural language prompt:
   ```
   "Go to YouTube and analyze the latest JavaScript tutorial on React hooks. 
   Summarize the key concepts and provide timestamps for important sections."
   ```

2. Optionally provide a direct video URL

3. Click "Start Analysis" and watch the real-time automation

4. Review the AI-generated analysis results

### Configuration

Access the Settings panel to configure:

- **Browser Settings**: Headless mode, timeouts, screenshot quality
- **Analysis Settings**: Capture intervals, frame strategies, timeouts
- **AI Settings**: Temperature, max tokens, model parameters
- **Capture Settings**: Screenshot formats and quality

### Frame Capture Strategies

- **Comprehensive**: Captures many frames for detailed analysis
- **Summary**: Captures key moments (beginning, middle, end)
- **Timeline**: Captures at regular intervals

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Create environment file:**
   ```bash
   echo "OVH_AI_TOKEN=your_token_here" > .env
   ```

2. **Deploy:**
   ```bash
   docker-compose up -d
   ```

### Using Docker directly

```bash
docker build -t video-analyzer .
docker run -p 3000:3000 -e OVH_AI_TOKEN=your_token video-analyzer
```

## API Reference

### Analysis Endpoints

- `POST /api/analyze` - Start new analysis
- `GET /api/analyze/status/:id` - Get analysis status
- `GET /api/analyze/results/:id` - Get analysis results
- `DELETE /api/analyze/:id` - Cancel analysis
- `GET /api/analyze/sessions` - List active sessions

### Settings Endpoints

- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings
- `POST /api/settings/reset` - Reset to defaults
- `GET /api/settings/options` - Get available options

### WebSocket Events

Connect to `ws://localhost:3000` for real-time updates:

- `screenshot` - Live automation screenshots
- `progress` - Analysis progress updates
- `status` - Status changes
- `session_update` - Session state changes

## Configuration

### Environment Variables

- `OVH_AI_TOKEN` - OVHcloud AI API token (required)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode

### Settings File

All other settings are configured via the WebUI and stored in `settings.json`:

```json
{
  "browser": {
    "headless": true,
    "timeout": 30000,
    "screenshotQuality": 80
  },
  "analysis": {
    "captureIntervals": 5,
    "frameStrategy": "comprehensive",
    "analysisTimeout": 60000
  },
  "ai": {
    "temperature": 0.1,
    "maxTokens": 2000
  }
}
```

## Architecture

- **Frontend**: Modern vanilla JavaScript with WebSocket integration
- **Backend**: Express.js with WebSocket support
- **Automation**: Midscene.js with Playwright
- **AI**: OVHcloud AI (Qwen2.5-VL-72B-Instruct)
- **Real-time**: WebSocket for live updates and screenshots

## Troubleshooting

### Common Issues

1. **AI connection fails**: Check your OVH_AI_TOKEN is valid
2. **Browser automation fails**: Ensure sufficient system resources
3. **WebSocket disconnects**: Check firewall settings

### Debug Mode

Set `NODE_ENV=development` for verbose logging.

### Rate Limits

OVHcloud AI has a rate limit of 400 requests/minute. The application includes automatic retry logic with exponential backoff.

## Development

### Project Structure

```
src/
├── web-ui/           # WebUI components
│   ├── public/       # Frontend files
│   └── routes/       # API routes
├── automation/       # Midscene automation
├── analysis/         # AI analysis logic
├── config/           # Configuration
└── web-server.js     # Main server
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📧 Issues: Use GitHub Issues
- 📚 Documentation: This README
- 🔧 Configuration: WebUI Settings panel