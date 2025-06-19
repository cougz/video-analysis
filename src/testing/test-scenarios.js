// Additional test scenarios for different platforms and edge cases
export const ExtendedTestScenarios = {
  
  // Platform-specific tests
  platforms: [
    {
      id: 'twitch-stream-test',
      name: 'Twitch Live Stream Analysis',
      prompt: 'Go to https://www.twitch.tv/directory/game/Just%20Chatting and analyze a live stream, focusing on viewer engagement.',
      url: 'https://www.twitch.tv/directory/game/Just%20Chatting',
      expectedOutcome: 'Should handle Twitch interface and analyze live streaming content',
      timeout: 240000,
      category: 'live-streaming'
    },
    {
      id: 'tiktok-discovery-test',
      name: 'TikTok Content Discovery',
      prompt: 'Go to https://www.tiktok.com/foryou and analyze trending short-form content patterns.',
      url: 'https://www.tiktok.com/foryou',
      expectedOutcome: 'Should handle TikTok and analyze short-form viral content',
      timeout: 180000,
      category: 'short-form'
    },
    {
      id: 'linkedin-learning-test',
      name: 'LinkedIn Learning Analysis',
      prompt: 'Find a professional development video on LinkedIn Learning and extract key learning objectives.',
      url: 'https://www.linkedin.com/learning/',
      expectedOutcome: 'Should navigate professional learning platform and extract educational content',
      timeout: 300000,
      category: 'professional-education'
    }
  ],

  // Cookie and consent challenges
  cookieChallenges: [
    {
      id: 'complex-cookie-site-test',
      name: 'Complex Cookie Consent Test',
      prompt: 'Go to https://www.cnn.com/videos and find a news video to analyze.',
      url: 'https://www.cnn.com/videos',
      expectedOutcome: 'Should handle complex news site cookies and video analysis',
      timeout: 180000,
      category: 'cookie-complex'
    },
    {
      id: 'gdpr-compliance-test',
      name: 'GDPR Cookie Compliance Test',
      prompt: 'Go to https://www.bbc.co.uk/iplayer and analyze a featured video.',
      url: 'https://www.bbc.co.uk/iplayer',
      expectedOutcome: 'Should handle GDPR-compliant cookie dialogs and media analysis',
      timeout: 200000,
      category: 'cookie-gdpr'
    }
  ],

  // Video type challenges
  videoTypes: [
    {
      id: 'embedded-video-test',
      name: 'Embedded Video Analysis',
      prompt: 'Go to https://www.coursera.org/browse/computer-science and find a course preview video to analyze.',
      url: 'https://www.coursera.org/browse/computer-science',
      expectedOutcome: 'Should handle embedded videos in educational platforms',
      timeout: 240000,
      category: 'embedded-video'
    },
    {
      id: 'auto-play-video-test',
      name: 'Auto-play Video Handling',
      prompt: 'Go to https://www.instagram.com/ and analyze auto-playing video content.',
      url: 'https://www.instagram.com/',
      expectedOutcome: 'Should handle auto-play videos and social media interfaces',
      timeout: 180000,
      category: 'auto-play'
    },
    {
      id: 'playlist-analysis-test',
      name: 'Video Playlist Analysis',
      prompt: 'Find a YouTube playlist about web development and analyze the learning progression across videos.',
      url: null,
      expectedOutcome: 'Should analyze multiple videos in sequence for learning patterns',
      timeout: 360000, // 6 minutes
      category: 'playlist'
    }
  ],

  // Performance and edge cases
  edgeCases: [
    {
      id: 'slow-loading-site-test',
      name: 'Slow Loading Site Test',
      prompt: 'Go to a video-heavy site and analyze content despite slow loading times.',
      url: 'https://archive.org/details/movies',
      expectedOutcome: 'Should handle slow-loading sites gracefully',
      timeout: 300000,
      category: 'performance'
    },
    {
      id: 'mobile-optimized-test',
      name: 'Mobile-Optimized Video Test',
      prompt: 'Analyze mobile-optimized video content and interface differences.',
      url: 'https://m.youtube.com/',
      expectedOutcome: 'Should handle mobile interfaces and responsive video players',
      timeout: 180000,
      category: 'mobile'
    },
    {
      id: 'multi-language-test',
      name: 'Multi-language Content Test',
      prompt: 'Find and analyze non-English video content, providing English translation of key points.',
      url: null,
      expectedOutcome: 'Should handle non-English content and provide translations',
      timeout: 240000,
      category: 'internationalization'
    }
  ],

  // AI and automation challenges
  aiChallenges: [
    {
      id: 'ambiguous-prompt-test',
      name: 'Ambiguous Prompt Handling',
      prompt: 'Find something interesting and tell me about it.',
      url: null,
      expectedOutcome: 'Should handle vague prompts by making reasonable assumptions',
      timeout: 300000,
      category: 'ai-reasoning'
    },
    {
      id: 'multi-step-task-test',
      name: 'Multi-step Task Execution',
      prompt: 'Go to YouTube, search for "machine learning basics", select the most viewed video, watch 2 minutes, then summarize the introduction.',
      url: 'https://www.youtube.com/',
      expectedOutcome: 'Should execute complex multi-step instructions accurately',
      timeout: 300000,
      category: 'complex-tasks'
    },
    {
      id: 'context-awareness-test',
      name: 'Context Awareness Test',
      prompt: 'Find a video about the current trending topic in technology and analyze its relevance.',
      url: null,
      expectedOutcome: 'Should demonstrate awareness of current trends and context',
      timeout: 300000,
      category: 'context-awareness'
    }
  ]

};

// Utility function to get all scenarios
export function getAllScenarios() {
  const allScenarios = [];
  
  Object.values(ExtendedTestScenarios).forEach(category => {
    if (Array.isArray(category)) {
      allScenarios.push(...category);
    }
  });
  
  return allScenarios;
}

// Get scenarios by category
export function getScenariosByCategory(category) {
  const allScenarios = getAllScenarios();
  return allScenarios.filter(scenario => scenario.category === category);
}

// Get random test scenarios
export function getRandomScenarios(count = 3) {
  const allScenarios = getAllScenarios();
  const shuffled = allScenarios.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default ExtendedTestScenarios;