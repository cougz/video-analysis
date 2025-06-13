import config from '../config/index.js';

export class UniversalNavigator {
  constructor(midsceneClient) {
    this.client = midsceneClient;
    this.navigationHistory = [];
    this.currentState = {
      currentPage: null,
      videoFound: false,
      navigationPath: []
    };
  }

  async navigateToVideo(userPrompt) {
    console.log(`🧭 Universal navigation requested: "${userPrompt}"`);
    
    try {
      // Use AI to create navigation plan
      const navigationPlan = await this.client.ai(`
        Based on this user request: "${userPrompt}"
        
        I need you to analyze what the user wants to do and help navigate. 
        Break this down into steps:
        1. What website/platform should I navigate to?
        2. What should I search for or look for on that website?
        3. What type of video content am I looking for?
        
        Provide a clear, step-by-step navigation plan.
      `);
      
      console.log('📋 Navigation plan created');
      
      // Extract target website from prompt
      const targetSite = await this.extractTargetWebsite(userPrompt);
      if (targetSite) {
        await this.client.navigateToUrl(targetSite);
        console.log(`🌐 Navigated to: ${targetSite}`);
      }
      
      // Execute intelligent search and navigation
      const searchResult = await this.performIntelligentSearch(userPrompt);
      if (!searchResult.success) {
        throw new Error(`Navigation failed: ${searchResult.error}`);
      }
      
      // Find and access video content
      const videoResult = await this.findAndAccessVideo(userPrompt);
      if (!videoResult.success) {
        throw new Error(`Video access failed: ${videoResult.error}`);
      }
      
      this.currentState.videoFound = true;
      console.log('✅ Successfully navigated to video content');
      
      return { success: true, navigationPath: this.currentState.navigationPath };
      
    } catch (error) {
      console.error('❌ Universal navigation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async extractTargetWebsite(userPrompt) {
    // Use AI to identify target website from natural language
    const siteExtraction = await this.client.ai(`
      From this request: "${userPrompt}"
      
      What website should I go to? Extract just the main domain (like youtube.com, coursera.org, etc.)
      If no specific site is mentioned, suggest the most appropriate one.
      
      Respond with just the domain name, nothing else.
    `);
    
    // Clean up the response to get just the domain
    const domain = siteExtraction.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    
    if (domain && domain.includes('.')) {
      return `https://${domain}`;
    }
    
    return null;
  }

  async performIntelligentSearch(userPrompt) {
    try {
      console.log('🔍 Performing intelligent search...');
      
      // Use AI to find and interact with search functionality
      const searchResult = await this.client.ai(`
        Look at this page and find the search functionality. 
        I want to search for content related to: "${userPrompt}"
        
        Please:
        1. Find the search box/input field
        2. Click on it
        3. Type the appropriate search terms
        4. Submit the search
        
        Extract the key search terms from the user's request automatically.
      `);
      
      // Wait for search results to load
      await this.client.page.waitForTimeout(3000);
      
      this.currentState.navigationPath.push('search_completed');
      return { success: true };
      
    } catch (error) {
      console.error('Search failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async findAndAccessVideo(userPrompt) {
    try {
      console.log('🎥 Finding and accessing video content...');
      
      // Use AI to identify and click on relevant video content
      const videoAccessResult = await this.client.ai(`
        Look at this page and find video content that matches: "${userPrompt}"
        
        Please:
        1. Identify videos or courses that match the user's request
        2. Click on the most relevant one
        3. If it's a course with multiple videos, navigate to the first video
        4. Make sure the video player is visible and ready
        
        Look for video thumbnails, course titles, or play buttons.
      `);
      
      // Wait for video page to load
      await this.client.page.waitForTimeout(5000);
      
      // Verify video player is present
      const playerFound = await this.detectVideoPlayer();
      if (playerFound) {
        this.currentState.navigationPath.push('video_accessed');
        return { success: true };
      } else {
        throw new Error('Video player not found after navigation');
      }
      
    } catch (error) {
      console.error('Video access failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async detectVideoPlayer() {
    try {
      // Use AI to detect any type of video player
      const playerDetection = await this.client.ai(`
        Look at this page and tell me:
        1. Is there a video player visible?
        2. What type of player is it? (YouTube, HTML5, custom, etc.)
        3. Can you see video controls like play/pause buttons?
        4. Is the video ready to be controlled?
        
        Respond with: PLAYER_FOUND or PLAYER_NOT_FOUND, followed by details.
      `);
      
      return playerDetection.includes('PLAYER_FOUND');
      
    } catch (error) {
      console.error('Player detection failed:', error.message);
      return false;
    }
  }

  async handleAuthenticationIfNeeded() {
    try {
      // Use AI to detect if authentication is needed
      const authCheck = await this.client.ai(`
        Look at this page and determine:
        1. Do I need to log in to access the content?
        2. Are there any login prompts or sign-in requirements?
        3. Can I access the content without authentication?
        
        Respond with: AUTH_REQUIRED or AUTH_NOT_REQUIRED
      `);
      
      if (authCheck.includes('AUTH_REQUIRED')) {
        console.log('🔐 Authentication required');
        
        // Try to handle authentication intelligently
        const loginResult = await this.client.ai(`
          I need to log in to access this content. Please:
          1. Find the login/sign-in button or link
          2. Click on it
          3. Look for username/email and password fields
          
          Note: I'll provide credentials separately if needed.
        `);
        
        // Here you could integrate with credential management
        // For now, just indicate auth was attempted
        this.currentState.navigationPath.push('auth_attempted');
        return { success: true, authRequired: true };
      }
      
      return { success: true, authRequired: false };
      
    } catch (error) {
      console.error('Authentication handling failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async navigateToSpecificContent(contentDescription) {
    try {
      console.log(`🎯 Navigating to specific content: ${contentDescription}`);
      
      const navigationResult = await this.client.ai(`
        I'm looking for specific content: "${contentDescription}"
        
        Please help me navigate to this content by:
        1. Looking for links, buttons, or sections that match this description
        2. Clicking on the most relevant option
        3. If it's a multi-step process, continue navigating until I reach the content
        
        Be smart about interpreting what the user wants.
      `);
      
      await this.client.page.waitForTimeout(3000);
      this.currentState.navigationPath.push(`content_${contentDescription.replace(/\s+/g, '_')}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Specific content navigation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async adaptToUnexpectedLayout() {
    try {
      console.log('🔄 Adapting to unexpected page layout...');
      
      // Use AI to understand the current page and adapt
      const adaptationResult = await this.client.ai(`
        I'm on a page that might have an unexpected layout. Please help me understand:
        1. What type of page is this?
        2. What navigation options are available?
        3. How can I find video or educational content?
        4. What should I click or do next?
        
        Be flexible and adaptive in your response.
      `);
      
      this.currentState.navigationPath.push('layout_adapted');
      return { success: true, adaptation: adaptationResult };
      
    } catch (error) {
      console.error('Layout adaptation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async handlePopupsAndInterruptions() {
    try {
      // Use AI to handle common interruptions
      const interruptionCheck = await this.client.ai(`
        Check if there are any popups, cookie banners, ads, or other interruptions on this page.
        If found, please close or dismiss them so we can continue navigation.
        
        Look for close buttons (X), "Accept", "Dismiss", "Skip" buttons, etc.
      `);
      
      await this.client.page.waitForTimeout(1000);
      return { success: true };
      
    } catch (error) {
      console.error('Interruption handling failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  getCurrentNavigationState() {
    return { ...this.currentState };
  }

  getNavigationHistory() {
    return [...this.navigationHistory];
  }

  resetNavigationState() {
    this.currentState = {
      currentPage: null,
      videoFound: false,
      navigationPath: []
    };
    this.navigationHistory = [];
  }
}

export default UniversalNavigator;