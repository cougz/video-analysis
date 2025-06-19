#!/usr/bin/env node
import AutomatedTestRunner from './src/testing/automated-test-runner.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const runner = new AutomatedTestRunner({
    settings: {
      browser: {
        timeout: 60000
      },
      analysis: {
        frameStrategy: args.includes('--comprehensive') ? 'comprehensive' : 'summary'
      }
    }
  });

  console.log('🤖 Video Analysis Testing Suite');
  console.log('===============================\n');

  try {
    switch (command) {
      case 'quick':
        console.log('⚡ Running Quick Test (Vimeo cookie + video analysis)');
        const quickResult = await runner.runQuickTest();
        console.log(quickResult.success ? '✅ Quick test passed!' : `❌ Quick test failed: ${quickResult.error}`);
        break;

      case 'cookies':
        console.log('🍪 Testing Cookie Consent Handling');
        const cookieResult = await runner.testCookieHandling();
        console.log(`Cookie tests: ${cookieResult.summary.passed}/${cookieResult.summary.total} passed`);
        break;

      case 'basic':
        console.log('📽️ Testing Basic Video Analysis');
        const basicResult = await runner.testBasicFunctionality();
        console.log(`Basic tests: ${basicResult.summary.passed}/${basicResult.summary.total} passed`);
        break;

      case 'educational':
        console.log('🎓 Testing Educational Content Analysis');
        const eduResult = await runner.testEducationalContent();
        console.log(`Educational tests: ${eduResult.summary.passed}/${eduResult.summary.total} passed`);
        break;

      case 'all':
        console.log('🚀 Running Full Test Suite');
        const fullResult = await runner.runTestSuite();
        console.log(`\n🏁 Test Suite Complete:`);
        console.log(`   Success Rate: ${fullResult.summary.successRate}%`);
        console.log(`   Total Time: ${Math.round(fullResult.duration/1000/60)} minutes`);
        break;

      case 'custom':
        if (args[1]) {
          console.log(`🎯 Running Custom Test: "${args[1]}"`);
          const customResult = await runner.runQuickTest(args[1]);
          console.log(customResult.success ? '✅ Custom test passed!' : `❌ Custom test failed: ${customResult.error}`);
        } else {
          console.log('❌ Please provide a custom prompt after "custom"');
          console.log('   Example: node run-tests.js custom "Go to YouTube and find a cat video"');
        }
        break;

      case 'list':
        console.log('📋 Available Test Scenarios:');
        const scenarios = runner.getTestScenarios();
        scenarios.forEach(s => {
          console.log(`   ${s.id} - ${s.name} (${s.category})`);
          console.log(`     "${s.prompt}"`);
          console.log(`     Expected: ${s.expectedOutcome}\n`);
        });
        break;

      case 'run':
        if (args[1]) {
          console.log(`🎯 Running specific test: ${args[1]}`);
          const testResult = await runner.runTestSuite([args[1]]);
          console.log(testResult.success ? '✅ Test passed!' : `❌ Test failed`);
        } else {
          console.log('❌ Please specify a test ID to run');
          console.log('   Use "node run-tests.js list" to see available tests');
        }
        break;

      case 'help':
      default:
        console.log('Available commands:');
        console.log('  quick       - Run a quick validation test (Vimeo + cookies)');
        console.log('  cookies     - Test cookie consent handling on various sites');
        console.log('  basic       - Test basic video analysis functionality');
        console.log('  educational - Test educational content analysis');
        console.log('  all         - Run the complete test suite');
        console.log('  custom "prompt" - Run a custom test with your prompt');
        console.log('  list        - List all available test scenarios');
        console.log('  run <test-id> - Run a specific test by ID');
        console.log('');
        console.log('Options:');
        console.log('  --comprehensive - Use comprehensive frame capture (default: summary)');
        console.log('');
        console.log('Examples:');
        console.log('  node run-tests.js quick');
        console.log('  node run-tests.js cookies');
        console.log('  node run-tests.js custom "Analyze a cooking video on YouTube"');
        console.log('  node run-tests.js run vimeo-cookie-test --comprehensive');
        break;
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);