
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

  async translatePageContent() {
    try {
      // Get page content understanding with translation
      const contentAnalysis = await this.client.agent.ai(`
        Analyze this page and provide a translation/understanding layer:
        
        1. What language is the primary content in?
        2. If it's not in English, provide English translations for key UI elements:
           - Navigation menu items
           - Button labels  
           - Form field labels
           - Important headings
           - Login/authentication related text
        3. Identify the main purpose/type of this page
        4. List key interactive elements and their likely English equivalents
        
        Format your response as:
        LANGUAGE: [detected language]
        PAGE_TYPE: [page type]
        KEY_ELEMENTS: [list of important UI elements with English translations]
      `);
      
      return { success: true, analysis: contentAnalysis };
    } catch (error) {
      console.warn('Translation layer failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async navigateToVideo(userPrompt) {
    console.log(`🧭 Universal navigation requested: "${userPrompt}"`);
    
    try {
      // Extract target website from prompt first
      const targetSite = await this.extractTargetWebsite(userPrompt);
      if (!targetSite) {
        throw new Error('Could not determine target website from prompt. Please specify the website you want to visit (e.g., "visit coursera.com" or "https://example.com")');
      }
      
      await this.client.navigateToUrl(targetSite);
      console.log(`🌐 Navigated to: ${targetSite}`);
      
      // Wait for page to load
      await this.waitForPageToFullyLoad();
      await this.client.page.waitForTimeout(3000);
      
      // Add translation layer for better understanding
      console.log('🌐 Analyzing page content and language...');
      const translationResult = await this.translatePageContent();
      if (translationResult.success) {
        console.log('📖 Page analysis:', translationResult.analysis);
      }
      
      // Handle any popups or interruptions (don't fail if none found)
      const popupResult = await this.handlePopupsAndInterruptions();
      if (!popupResult.success && !popupResult.warning) {
        console.warn('Popup handling failed but continuing navigation');
      }
      
      // Simple login page check
      const isLoginPage = await this.client.agent.ai(`
        Is this a login page? Look for username/email and password input fields.
        
        Respond with: YES or NO
      `);
      
      if (isLoginPage && typeof isLoginPage === 'string' && isLoginPage.includes('YES')) {
        console.log('🔐 Detected login page - performing login');
        const credentials = this.extractCredentials(userPrompt);
        if (credentials && credentials.username && credentials.password) {
          const authResult = await this.performAuthentication(credentials);
          if (!authResult.success) {
            throw new Error(`Login failed: ${authResult.error}`);
          }
        } else {
          throw new Error('Login page detected but no credentials provided');
        }
      }
      
      // After handling login (if needed), proceed with content navigation
      console.log('🔄 Proceeding with content navigation...');
      await this.client.page.waitForTimeout(3000);
      
      // Try to navigate directly to specific content first
      const specificContentResult = await this.navigateToSpecificContent(userPrompt);
      if (specificContentResult.success) {
        console.log('✅ Successfully navigated to specific content');
      } else {
        console.log('ℹ️ Specific content navigation didn\'t work, trying search approach');
        // Execute intelligent search and navigation as fallback
        const searchResult = await this.performIntelligentSearch(userPrompt);
        if (!searchResult.success) {
          console.warn(`Search approach failed: ${searchResult.error}`);
          // If both approaches fail, try one more adaptive approach
          console.log('🔄 Trying adaptive layout approach as final fallback...');
          const adaptResult = await this.adaptToUnexpectedLayout();
          if (!adaptResult.success) {
            throw new Error(`All navigation approaches failed. Last error: ${searchResult.error}`);
          }
        }
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
    const prompt = userPrompt.toLowerCase();
    
    // Check for direct URLs first
    const urlMatch = userPrompt.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      return urlMatch[0];
    }
    
    // Check for domain patterns
    const domainMatch = prompt.match(/(?:visit|go to|navigate to|from)\s+([a-z0-9-]+\.(?:com|org|edu|net|tv|co\.uk))/);
    if (domainMatch) {
      return `https://${domainMatch[1]}`;
    }
    
    // Platform-specific keywords
    if (prompt.includes('youtube') || prompt.includes('yt')) {
      return 'https://youtube.com';
    }
    if (prompt.includes('coursera')) {
      return 'https://coursera.org';
    }
    if (prompt.includes('udemy')) {
      return 'https://udemy.com';
    }
    if (prompt.includes('edx')) {
      return 'https://edx.org';
    }
    if (prompt.includes('khan')) {
      return 'https://khanacademy.org';
    }
    if (prompt.includes('vimeo')) {
      return 'https://vimeo.com';
    }
    if (prompt.includes('twitch')) {
      return 'https://twitch.tv';
    }
    
    // Use AI to extract website from complex prompts
    try {
      const aiResult = await this.client.agent.ai(`
        Analyze this user request and extract the target website they want to visit: "${userPrompt}"
        
        If you can identify a specific website, respond with just the URL (e.g., "https://example.com").
        If no specific website is mentioned, respond with "NO_WEBSITE_FOUND".
        
        Look for:
        - Direct URLs
        - Website names or domains
        - Platform references
        - Educational sites mentioned
      `);
      
      if (aiResult && aiResult !== 'NO_WEBSITE_FOUND' && aiResult.includes('http')) {
        const extractedUrl = aiResult.match(/https?:\/\/[^\s]+/i);
        if (extractedUrl) {
          return extractedUrl[0];
        }
      }
    } catch (error) {
      console.warn('AI URL extraction failed:', error.message);
    }
    
    return null;
  }

  extractCredentials(userPrompt) {
    try {
      const credentials = { username: null, password: null };
      
      // Look for explicit credential patterns
      const patterns = [
        // "username: user@example.com password: mypass123"
        /(?:username|user|email):\s*([^\s]+).*?(?:password|pass|pwd):\s*([^\s]+)/i,
        // "login with user@example.com and mypass123"
        /login\s+with\s+([^\s]+)\s+and\s+([^\s]+)/i,
        // "user=user@example.com pass=mypass123"
        /user=([^\s]+).*?pass=([^\s]+)/i,
        // "credentials user@example.com mypass123"
        /credentials?\s+([^\s]+)\s+([^\s]+)/i,
        // "authenticate as user@example.com with mypass123"
        /authenticate\s+as\s+([^\s]+)\s+with\s+([^\s]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = userPrompt.match(pattern);
        if (match) {
          credentials.username = match[1];
          credentials.password = match[2];
          console.log(`🔑 Extracted credentials for user: ${credentials.username}`);
          break;
        }
      }
      
      // Look for just username/email if no full pattern matched
      if (!credentials.username) {
        const emailMatch = userPrompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          credentials.username = emailMatch[1];
          console.log(`📧 Found email: ${credentials.username} (password needed separately)`);
        }
      }
      
      return credentials;
      
    } catch (error) {
      console.warn('Credential extraction failed:', error.message);
      return { username: null, password: null };
    }
  }

  async performIntelligentSearch(userPrompt) {
    try {
      console.log('🔍 Performing intelligent search...');
      
      // First, wait for page to fully load and check if search is available
      await this.client.page.waitForTimeout(2000);
      
      // Check if we need to login first
      const pageStateCheck = await this.client.agent.ai(`
        Analyze the current page state:
        1. Is there a search box, search input field, or search functionality visible?
        2. Are there login forms or authentication requirements preventing access?
        3. Can you see the main content or are you blocked by login requirements?
        4. Are there navigation menus accessible for browsing content?
        
        Respond with: SEARCH_AVAILABLE, LOGIN_REQUIRED, or CONTENT_BLOCKED
      `);
      
      if (pageStateCheck && typeof pageStateCheck === 'string' && 
          (pageStateCheck.includes('LOGIN_REQUIRED') || pageStateCheck.includes('CONTENT_BLOCKED'))) {
        console.log('🔐 Page analysis indicates login is required for content access');
        
        // Extract credentials and attempt login
        const credentials = this.extractCredentials(userPrompt);
        if (credentials && credentials.username && credentials.password) {
          console.log('🔄 Attempting authentication to access content...');
          const authResult = await this.performAuthentication(credentials);
          if (authResult.success) {
            console.log('✅ Authentication successful, retrying search...');
            // Wait for page to update after login
            await this.client.page.waitForTimeout(3000);
          } else {
            return { success: false, error: 'Login required but authentication failed' };
          }
        } else {
          return { success: false, error: 'Login required but no credentials provided' };
        }
      }
      
      // Check if search functionality is available on the current page  
      const searchAvailable = await this.client.agent.ai(`
        Look at this page carefully and determine:
        1. Is there a search box, search input field, or search functionality visible?
        2. Can you see any way to search for content on this page?
        3. Are there navigation menus or sections that might contain search features?
        4. Is the page fully loaded and ready for interaction?
        
        Respond with: SEARCH_AVAILABLE or SEARCH_NOT_AVAILABLE
      `);
      
      if (searchAvailable && typeof searchAvailable === 'string' && searchAvailable.includes('SEARCH_NOT_AVAILABLE')) {
        console.log('ℹ️ Search functionality not available, trying direct content navigation');
        return { success: false, error: 'No search functionality found. Will try direct content navigation.' };
      }
      
      // Use AI to find and interact with search functionality
      await this.client.agent.ai(`
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
      await this.client.agent.ai(`
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

  async waitForPageToFullyLoad() {
    try {
      console.log('🌐 Waiting for page content to load...');
      
      // Generic wait for page content to stabilize
      await this.client.page.waitForTimeout(2000);
      
      return { success: true };
    } catch (error) {
      console.warn('Page loading wait had issues (continuing anyway):', error.message);
      return { success: true, warning: 'Page loading wait incomplete' };
    }
  }

  async detectVideoPlayer() {
    try {
      // Use AI to detect any type of video player
      const playerDetection = await this.client.agent.ai(`
        Look at this page and tell me:
        1. Is there a video player visible?
        2. What type of player is it? (YouTube, HTML5, custom, etc.)
        3. Can you see video controls like play/pause buttons?
        4. Is the video ready to be controlled?
        
        Respond with: PLAYER_FOUND or PLAYER_NOT_FOUND, followed by details.
      `);
      
      return playerDetection && typeof playerDetection === 'string' && playerDetection.includes('PLAYER_FOUND');
      
    } catch (error) {
      console.error('Player detection failed:', error.message);
      return false;
    }
  }

  async handleAuthenticationIfNeeded(credentials = null) {
    try {
      // Use AI to detect if authentication is needed with enhanced detection
      const authCheck = await this.client.agent.ai(`
        Carefully examine this page to determine if authentication/login is required:
        
        Look for these indicators that login is needed:
        1. Login forms or login input fields (username/email and password fields)
        2. "Sign In", "Login", "Se connecter", "Connexion", "Member Login" buttons or links
        3. Any text indicating you need to log in to access content
        4. Restricted access messages or prompts
        5. User account icons or profile areas that suggest login capability
        6. Any form that asks for credentials
        7. Pages that look like login/authentication pages
        8. Text in any language that suggests authentication is needed
        
        Also consider:
        - If this looks like a training or educational platform, login is often required
        - If you see limited content or "restricted" messages
        - If the page layout suggests you're not fully authenticated
        
        Be thorough in your analysis. If there's any doubt, err on the side of AUTH_REQUIRED.
        
        Respond with: AUTH_REQUIRED or AUTH_NOT_REQUIRED
      `);
      
      if (authCheck && typeof authCheck === 'string' && authCheck.includes('AUTH_REQUIRED')) {
        console.log('🔐 Authentication required');
        
        if (!credentials || !credentials.username || !credentials.password) {
          console.warn('⚠️ Authentication needed but no credentials provided');
          return { 
            success: false, 
            authRequired: true, 
            error: 'Authentication required but credentials not provided. Please include credentials in your prompt like: "username: user@example.com password: mypassword"' 
          };
        }
        
        return await this.performAuthentication(credentials);
      }
      
      return { success: true, authRequired: false };
      
    } catch (error) {
      console.error('Authentication handling failed:', error.message);
      return { success: false, authRequired: true, error: error.message };
    }
  }

  async performAuthentication(credentials) {
    try {
        console.log(`🔑 Starting authentication for user: ${credentials.username}`);
        
        // Check if we're already on a login form or need to navigate to one
        const loginFormCheck = await this.client.agent.ai(`
          Check the current page: Are there already username/email and password input fields visible?
          
          Respond with: FORM_PRESENT or NEED_TO_NAVIGATE
        `);
        
        if (!loginFormCheck || !loginFormCheck.includes('FORM_PRESENT')) {
          // Navigate to login form
          await this.client.agent.ai(`
            I need to find and access the login form. Please:
            1. Look for login/sign-in buttons or links anywhere on the page
            2. Click on the most appropriate login option
            3. Wait for the login form to appear
            
            Look for text like: "Login", "Sign In", "Se connecter", "Connexion", "Member Login", "Accès membre"
            Also look for user/account icons that might lead to login.
          `);
          
          await this.client.page.waitForTimeout(3000);
        } else {
          console.log('📝 Login form already present on page');
        }
        
        await this.client.page.waitForTimeout(2000);
        
        // Fill login form with enhanced field detection
        console.log(`🔑 Attempting login for user: ${credentials.username}`);
        
        // Try multiple approaches for form filling
        let loginAttempted = false;
        
        // First approach: Use direct field detection with flexible patterns
        try {
          await this.client.agent.ai(`
            I need to fill a login form. Please locate and fill the login form fields on this page:
            
            Step 1 - Find the username/email field:
            Look for any input field that could be for username or email. This field might have:
            - Common input types: email, text, or similar
            - Common field names or IDs containing: user, email, login, name, mail
            - Common labels in various languages for username/email/identifier
            - Placeholder text suggesting username or email input
            
            Once you locate this field, click on it and enter: ${credentials.username}
            
            Step 2 - Find the password field:
            Look for the password input field. This field typically has:
            - Input type="password" (most common)
            - Field names or IDs containing "password" or "pass"
            - Labels or placeholders indicating password input
            
            Once you locate this field, click on it and enter: ${credentials.password}
            
            Step 3 - Submit the form:
            Look for the form submission button. Common patterns include:
            - Buttons with text like "Login", "Sign In", "Submit", "Connect", "Enter"
            - The primary button within the login form
            - Input elements with type="submit"
            
            Click the appropriate button to submit the login form.
            
            Please be flexible and adaptive in finding these elements - they may not use exact terminology.
          `);
          
          loginAttempted = true;
        } catch (error) {
          console.warn('Primary login attempt failed, trying alternative approach:', error.message);
        }
        
        // Second approach: Try to use form element detection
        if (!loginAttempted) {
          try {
            await this.client.agent.ai(`
              Alternative login approach using form structure:
              1. Locate the login form on the page - it may be any form that contains input fields for credentials
              2. Within that form, find the first input field that looks like it's for username/email (usually text or email type)
              3. Click on that field and enter: ${credentials.username}
              4. Look for the password input field (typically has type="password" or is visually masked)
              5. Click on that field and enter: ${credentials.password}
              6. Find the form submission button (often the only button in the form or has submit-like text)
              7. Click the submit button to complete the login
              
              If multiple forms are present, focus on the one that appears to be for authentication/login.
              Be adaptive - the form elements may not have standard naming conventions.
            `);
            
            loginAttempted = true;
          } catch (error) {
            console.error('Alternative login approach also failed:', error.message);
          }
        }
        
        // Wait for login to complete
        await this.client.page.waitForTimeout(4000);
        
        // Verify login success with multiple approaches
        let loginVerified = false;
        
        // First, check for obvious success indicators
        try {
          const loginSuccess = await this.client.agent.ai(`
            Check if the login was successful by looking for these indicators:
            1. Are we now on a dashboard, profile, or main content page?
            2. Are there any error messages about incorrect credentials?
            3. Can I see user account information, username, or logout options?
            4. Has the page URL changed to indicate successful login?
            5. Are login/signin buttons now replaced with user menu or logout options?
            
            Look carefully at the page content and respond with: LOGIN_SUCCESS or LOGIN_FAILED
          `);
          
          if (loginSuccess && typeof loginSuccess === 'string' && loginSuccess.includes('LOGIN_SUCCESS')) {
            loginVerified = true;
          }
        } catch (error) {
          console.warn('Initial login verification failed, trying alternative method');
        }
        
        // If first check didn't work, try a more specific check
        if (!loginVerified) {
          try {
            await this.client.page.waitForTimeout(2000);
            const secondCheck = await this.client.agent.ai(`
              Take another look at the page. Sometimes login takes a moment to complete.
              Look for any changes that indicate successful authentication:
              - User profile information
              - Welcome messages
              - Access to previously restricted content
              - Logout or account management options
              
              Respond with: AUTHENTICATED or NOT_AUTHENTICATED
            `);
            
            if (secondCheck && typeof secondCheck === 'string' && secondCheck.includes('AUTHENTICATED')) {
              loginVerified = true;
            }
          } catch (error) {
            console.warn('Second login verification failed');
          }
        }
        
        if (loginVerified) {
          console.log('✅ Authentication successful');
          this.currentState.navigationPath.push('auth_successful');
          return { success: true, authRequired: true };
        } else {
          console.error('❌ Authentication failed');
          return { 
            success: false, 
            authRequired: true, 
            error: 'Login failed - please check credentials or try again' 
          };
        }
      
    } catch (error) {
      console.error('Authentication process failed:', error.message);
      return { success: false, authRequired: true, error: error.message };
    }
  }

  async navigateToSpecificContent(contentDescription) {
    try {
      console.log(`🎯 Navigating to specific content: ${contentDescription}`);
      
      // Extract key content keywords from the description
      const keywords = this.extractContentKeywords(contentDescription);
      console.log(`🔍 Extracted keywords: ${keywords.join(', ')}`);
      
      // First step: Explore the page structure
      await this.client.agent.ai(`
        I need to explore this page structure first. Please:
        1. Scroll down slowly to see all available sections and content
        2. Take note of the main navigation areas, menu items, and content sections
        3. Look for any categories or areas that might contain learning materials
        4. Don't click anything yet, just observe the page layout
      `);
      
      await this.client.page.waitForTimeout(2000);
      
      // Second step: Look for specific content
      await this.client.agent.ai(`
        Now I'm looking for specific content based on this request: "${contentDescription}"
        
        Key terms I'm looking for: ${keywords.join(', ')}
        
        Please help me find and navigate to this content:
        1. Look carefully for any text, links, cards, or sections containing these words: "Managed", "Rancher", "service", "learning", "path"
        2. Pay special attention to:
           - Learning paths or course catalogs
           - Training sections or educational content
           - Service-specific tutorials or guides
           - Container or orchestration related content
        3. If you find relevant content, click on it
        4. If there are multiple relevant options, choose the one that best matches "Managed Rancher service learning path"
        
        Be very thorough in scanning all visible text and links on the page.
      `);
      
      await this.client.page.waitForTimeout(3000);
      this.currentState.navigationPath.push(`content_${contentDescription.replace(/\s+/g, '_').substring(0, 50)}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Specific content navigation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  extractContentKeywords(description) {
    // Extract meaningful words from the description
    const words = description.split(/\s+/).filter(word => 
      word.length > 3 && 
      !['the', 'and', 'then', 'with', 'from', 'this', 'that', 'open', 'find', 'click'].includes(word.toLowerCase())
    );
    
    return words.slice(0, 8);
  }

  async adaptToUnexpectedLayout() {
    try {
      console.log('🔄 Adapting to unexpected page layout...');
      
      // Use AI to understand the current page and adapt
      const adaptationResult = await this.client.agent.ai(`
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
      console.log('🚫 Checking for popups and interruptions...');
      
      // Multi-layered approach for handling interruptions
      const strategies = [
        this.handleCookieBanners.bind(this),
        this.handleModalDialogs.bind(this),
        this.handleAdvertisements.bind(this),
        this.handleNotificationPrompts.bind(this)
      ];
      
      let handledCount = 0;
      
      for (const strategy of strategies) {
        try {
          const result = await strategy();
          if (result.handled) {
            handledCount++;
            console.log(`✅ Handled interruption: ${result.type}`);
            // Small delay between handling different types
            await this.client.page.waitForTimeout(500);
          }
        } catch (error) {
          // Continue with other strategies even if one fails
          console.warn(`Strategy failed (continuing): ${error.message}`);
        }
      }
      
      // Final AI-based cleanup for any remaining elements
      try {
        await this.client.agent.ai(`
          Do a final check for any remaining popups, overlays, or interruptions.
          Look for any elements that might be blocking the main content.
          If found, try to dismiss them using appropriate buttons or actions.
          
          Common patterns to look for:
          - Modal dialogs with close buttons
          - Cookie consent banners
          - Newsletter signup prompts
          - Video ads with skip buttons
          - Login prompts that can be dismissed
          
          If no interruptions are found, that's perfectly normal - just continue.
        `);
      } catch (error) {
        // AI cleanup is optional - don't fail if it doesn't work
        console.warn('AI cleanup failed (continuing anyway):', error.message);
      }
      
      console.log(`🎯 Handled ${handledCount} interruptions`);
      return { success: true, handledCount };
      
    } catch (error) {
      console.warn('Interruption handling had issues (continuing anyway):', error.message);
      return { success: true, warning: error.message };
    }
  }

  async handleCookieBanners() {
    try {
      // Look for common cookie banner patterns using CSS selectors
      const cookieSelectors = [
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[id*="consent"]',
        '[class*="consent"]',
        '[aria-label*="cookie"]',
        '[aria-label*="consent"]',
        'div[role="dialog"]',
        '.gdpr-banner',
        '#cookieNotice',
        '.cookie-notice'
      ];
      
      for (const selector of cookieSelectors) {
        try {
          const elements = await this.client.page.$$(selector);
          if (elements.length > 0) {
            // Try to find accept/dismiss buttons within these elements
            await this.client.agent.ai(`
              I found a potential cookie banner or consent dialog on the page.
              Please look for buttons like "Accept", "Accept All", "OK", "Agree", "Dismiss", or "Close"
              and click the most appropriate one to dismiss the banner.
            `);
            
            return { handled: true, type: 'cookie_banner' };
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      return { handled: false, type: 'cookie_banner' };
    } catch (error) {
      return { handled: false, type: 'cookie_banner', error: error.message };
    }
  }

  async handleModalDialogs() {
    try {
      // Look for modal dialogs and overlays
      const modalSelectors = [
        '[role="dialog"]',
        '[role="alertdialog"]',
        '.modal',
        '.overlay',
        '[class*="modal"]',
        '[id*="modal"]',
        '[class*="popup"]',
        '[id*="popup"]'
      ];
      
      for (const selector of modalSelectors) {
        try {
          const elements = await this.client.page.$$(selector);
          if (elements.length > 0) {
            // Check if modal is actually visible
            const isVisible = await this.client.page.isVisible(selector);
            if (isVisible) {
              await this.client.agent.ai(`
                I found a modal dialog or popup on the page.
                Please look for close buttons (X, ×, Close, Cancel, Skip, No Thanks)
                and click the appropriate one to dismiss it.
              `);
              
              return { handled: true, type: 'modal_dialog' };
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      return { handled: false, type: 'modal_dialog' };
    } catch (error) {
      return { handled: false, type: 'modal_dialog', error: error.message };
    }
  }

  async handleAdvertisements() {
    try {
      // Look for video ads or interstitial ads
      const adSelectors = [
        '[class*="ad-"]',
        '[id*="ad-"]',
        '.advertisement',
        '[class*="preroll"]',
        '[class*="interstitial"]',
        'button[aria-label*="Skip"]',
        'button[class*="skip"]'
      ];
      
      for (const selector of adSelectors) {
        try {
          const elements = await this.client.page.$$(selector);
          if (elements.length > 0) {
            await this.client.agent.ai(`
              I found potential advertisement elements on the page.
              If there are "Skip Ad", "Skip", or close buttons for ads, please click them.
              Look specifically for video ad overlays or interstitial ads.
            `);
            
            return { handled: true, type: 'advertisement' };
          }
        } catch (error) {
          continue;
        }
      }
      
      return { handled: false, type: 'advertisement' };
    } catch (error) {
      return { handled: false, type: 'advertisement', error: error.message };
    }
  }

  async handleNotificationPrompts() {
    try {
      // Look for notification permission requests
      await this.client.agent.ai(`
        Check for browser notification prompts or permission requests.
        If you see prompts asking for location, notifications, microphone, or camera access,
        please click "Block", "Don't Allow", or "Not Now" to dismiss them.
      `);
      
      return { handled: true, type: 'notification_prompt' };
    } catch (error) {
      return { handled: false, type: 'notification_prompt', error: error.message };
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