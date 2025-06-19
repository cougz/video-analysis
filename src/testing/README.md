# Automated Testing Suite

This testing suite allows you to automatically test various prompts and scenarios without manual intervention.

## Quick Start

```bash
# Run a quick validation test
npm run test:quick

# Test cookie consent handling
npm run test:cookies

# Run the full test suite
npm run test:all

# Run custom test with your own prompt
node run-tests.js custom "Find a cooking video and analyze the recipe steps"
```

## Available Commands

### Basic Testing
- `npm run test:quick` - Quick Vimeo cookie consent + video analysis test
- `npm run test:cookies` - Test cookie handling across multiple sites
- `npm run test:all` - Run complete test suite (all scenarios)

### Advanced Testing
```bash
# List all available test scenarios
node run-tests.js list

# Run specific test by ID
node run-tests.js run vimeo-cookie-test

# Use comprehensive frame capture
node run-tests.js basic --comprehensive

# Custom prompt testing
node run-tests.js custom "Your custom prompt here"
```

## Test Categories

### Cookie Handling Tests
- **vimeo-cookie-test**: Vimeo cookie consent and video analysis
- **cookie-heavy-site-test**: Dailymotion with multiple cookie dialogs
- **gdpr-compliance-test**: BBC iPlayer GDPR cookies
- **complex-cookie-site-test**: CNN news site complex cookies

### Basic Functionality Tests
- **youtube-basic-test**: YouTube video analysis
- **short-video-test**: YouTube Shorts analysis
- **educational-content-test**: Educational video discovery and analysis

### Platform-Specific Tests
- **twitch-stream-test**: Live streaming analysis
- **tiktok-discovery-test**: Short-form viral content
- **linkedin-learning-test**: Professional learning content

### Advanced AI Tests
- **multi-step-task-test**: Complex multi-step instructions
- **ambiguous-prompt-test**: Handling vague prompts
- **context-awareness-test**: Current trend awareness

## Test Results

Test results are automatically saved to `test-reports/` directory with:
- Detailed logs of each test execution
- Screenshots captured during tests
- Performance metrics and timing
- Success/failure analysis

## Configuration

Tests can be configured with:
- `--comprehensive` - Use comprehensive frame capture (default: summary)

## Example Output

```
🧪 Starting test: Vimeo Cookie Consent Test
📝 Prompt: Go to https://vimeo.com/ and watch the first video...
🌐 URL: https://vimeo.com/

📈 10% - Navigating to video...
🔄 Status: checking - Checking for cookie consent dialog
📸 Screenshot: Navigated to https://vimeo.com/
🔄 Status: consent-handled - Accepted cookies with: Accept all
📈 25% - Successfully navigated to video
✅ Test passed: Vimeo Cookie Consent Test (45s)
```

## Adding New Tests

You can add new test scenarios by editing `src/testing/test-scenarios.js` or by creating custom prompts:

```javascript
// Add to test scenarios
{
  id: 'my-custom-test',
  name: 'My Custom Test',
  prompt: 'Your test prompt here',
  url: 'https://example.com',
  expectedOutcome: 'What should happen',
  timeout: 180000,
  category: 'custom'
}
```

## Troubleshooting

- If tests timeout, increase the timeout value in the scenario
- Check test reports in `test-reports/` for detailed logs and screenshots
- Ensure your OVH AI credentials are properly configured
- Use `--comprehensive` for more detailed frame capture if needed