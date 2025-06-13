import config from '../config/index.js';

export class PlatformNavigator {
  constructor(midsceneClient) {
    this.client = midsceneClient;
    this.currentPlatform = null;
    this.navigationState = {
      loggedIn: false,
      currentCourse: null,
      currentModule: null,
      videoPosition: 0
    };
  }

  async detectPlatform(url) {
    const platformPatterns = {
      udemy: /udemy\.com/i,
      coursera: /coursera\.org/i,
      edx: /edx\.org/i,
      pluralsight: /pluralsight\.com/i,
      linkedin: /linkedin\.com\/learning/i,
      udacity: /udacity\.com/i,
      skillshare: /skillshare\.com/i,
      masterclass: /masterclass\.com/i,
      generic: /.*/
    };

    for (const [platform, pattern] of Object.entries(platformPatterns)) {
      if (pattern.test(url)) {
        this.currentPlatform = platform;
        console.log(`Detected platform: ${platform}`);
        return platform;
      }
    }

    return 'generic';
  }

  async authenticateUser(username, password) {
    try {
      console.log(`Authenticating user for ${this.currentPlatform} platform...`);
      
      const strategy = this.getAuthenticationStrategy(this.currentPlatform);
      const result = await strategy(username, password);
      
      if (result.success) {
        this.navigationState.loggedIn = true;
        console.log('Authentication successful');
      }
      
      return result;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  getAuthenticationStrategy(platform) {
    const strategies = {
      udemy: this.authenticateUdemy.bind(this),
      coursera: this.authenticateCoursera.bind(this),
      edx: this.authenticateEdX.bind(this),
      pluralsight: this.authenticatePluralsight.bind(this),
      linkedin: this.authenticateLinkedIn.bind(this),
      generic: this.authenticateGeneric.bind(this)
    };

    return strategies[platform] || strategies.generic;
  }

  async authenticateUdemy(username, password) {
    try {
      await this.client.page.waitForSelector('[data-purpose="header-login"]', { timeout: 10000 });
      await this.client.page.click('[data-purpose="header-login"]');
      
      await this.client.page.waitForSelector('#id_email', { timeout: 5000 });
      await this.client.page.fill('#id_email', username);
      await this.client.page.fill('#id_password', password);
      
      await this.client.page.click('[data-purpose="submit"]');
      
      await this.client.page.waitForSelector('[data-purpose="user-dropdown"]', { timeout: 15000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async authenticateCoursera(username, password) {
    try {
      await this.client.page.waitForSelector('button[data-track-component="header_login"]', { timeout: 10000 });
      await this.client.page.click('button[data-track-component="header_login"]');
      
      await this.client.page.waitForSelector('#email', { timeout: 5000 });
      await this.client.page.fill('#email', username);
      await this.client.page.fill('#password', password);
      
      await this.client.page.click('button[data-e2e="signin-button"]');
      
      await this.client.page.waitForSelector('[data-e2e="header-dropdown-button"]', { timeout: 15000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async authenticateEdX(username, password) {
    try {
      await this.client.page.waitForSelector('.header-user-menu .sign-in-btn', { timeout: 10000 });
      await this.client.page.click('.header-user-menu .sign-in-btn');
      
      await this.client.page.waitForSelector('#login-email', { timeout: 5000 });
      await this.client.page.fill('#login-email', username);
      await this.client.page.fill('#login-password', password);
      
      await this.client.page.click('.login-button');
      
      await this.client.page.waitForSelector('.header-user-menu .dropdown', { timeout: 15000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async authenticatePluralsight(username, password) {
    try {
      await this.client.page.waitForSelector('[data-automation="header-login-link"]', { timeout: 10000 });
      await this.client.page.click('[data-automation="header-login-link"]');
      
      await this.client.page.waitForSelector('#Username', { timeout: 5000 });
      await this.client.page.fill('#Username', username);
      await this.client.page.fill('#Password', password);
      
      await this.client.page.click('#login');
      
      await this.client.page.waitForSelector('[data-automation="user-menu-toggle"]', { timeout: 15000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async authenticateLinkedIn(username, password) {
    try {
      await this.client.page.waitForSelector('.sign-in-form__sign-in-cta', { timeout: 10000 });
      await this.client.page.click('.sign-in-form__sign-in-cta');
      
      await this.client.page.waitForSelector('#username', { timeout: 5000 });
      await this.client.page.fill('#username', username);
      await this.client.page.fill('#password', password);
      
      await this.client.page.click('.btn__primary--large');
      
      await this.client.page.waitForSelector('.global-nav__me', { timeout: 15000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async authenticateGeneric(username, password) {
    return await this.client.login(username, password);
  }

  async navigateToCourseCatalog() {
    try {
      console.log('Navigating to course catalog...');
      
      const strategy = this.getCatalogNavigationStrategy(this.currentPlatform);
      return await strategy();
    } catch (error) {
      console.error('Failed to navigate to catalog:', error.message);
      return { success: false, error: error.message };
    }
  }

  getCatalogNavigationStrategy(platform) {
    const strategies = {
      udemy: this.navigateToUdemyCatalog.bind(this),
      coursera: this.navigateToCourseraCatalog.bind(this),
      edx: this.navigateToEdXCatalog.bind(this),
      pluralsight: this.navigateToPluralsightCatalog.bind(this),
      linkedin: this.navigateToLinkedInCatalog.bind(this),
      generic: this.navigateToGenericCatalog.bind(this)
    };

    return strategies[platform] || strategies.generic;
  }

  async navigateToUdemyCatalog() {
    await this.client.page.click('[data-purpose="header-teach-on-udemy"]');
    return { success: true };
  }

  async navigateToCourseraCatalog() {
    await this.client.page.click('a[href*="/browse"]');
    return { success: true };
  }

  async navigateToEdXCatalog() {
    await this.client.page.click('a[href*="/course"]');
    return { success: true };
  }

  async navigateToPluralsightCatalog() {
    await this.client.page.click('[data-automation="browse-menu"]');
    return { success: true };
  }

  async navigateToLinkedInCatalog() {
    await this.client.page.click('a[href*="/learning/"]');
    return { success: true };
  }

  async navigateToGenericCatalog() {
    // Use AI to find course/catalog navigation
    return await this.client.agent.ai('click on courses or catalog menu');
  }

  async searchAndSelectCourse(courseTitle) {
    try {
      console.log(`Searching for course: ${courseTitle}`);
      
      // Generic search approach
      const searchSelectors = [
        'input[placeholder*="search" i]',
        'input[placeholder*="course" i]',
        'input[type="search"]',
        '.search-input',
        '#search',
        '[data-purpose="search-input"]'
      ];

      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          searchInput = await this.client.page.$(selector);
          if (searchInput) break;
        } catch (e) {
          continue;
        }
      }

      if (searchInput) {
        await searchInput.fill(courseTitle);
        await this.client.page.keyboard.press('Enter');
        
        // Wait for search results
        await this.client.page.waitForTimeout(3000);
        
        // Click on first matching course
        const courseSelectors = [
          `[title*="${courseTitle}" i]`,
          `[alt*="${courseTitle}" i]`,
          `.course-card:has-text("${courseTitle}")`,
          `a:has-text("${courseTitle}")`
        ];

        for (const selector of courseSelectors) {
          try {
            const courseElement = await this.client.page.$(selector);
            if (courseElement) {
              await courseElement.click();
              this.navigationState.currentCourse = courseTitle;
              console.log(`Selected course: ${courseTitle}`);
              return { success: true };
            }
          } catch (e) {
            continue;
          }
        }
      }

      // Fallback to AI-based navigation
      const aiResult = await this.client.agent.ai(`search for and select course titled "${courseTitle}"`);
      this.navigationState.currentCourse = courseTitle;
      return { success: true };

    } catch (error) {
      console.error(`Failed to select course ${courseTitle}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async extractCourseStructure() {
    try {
      console.log('Extracting course structure...');
      
      const structure = {
        title: '',
        description: '',
        duration: '',
        modules: [],
        videos: [],
        totalLessons: 0
      };

      // Extract basic course info
      const titleSelectors = [
        'h1',
        '.course-title',
        '[data-purpose="course-title"]',
        '.course-header h1'
      ];

      for (const selector of titleSelectors) {
        try {
          const titleElement = await this.client.page.$(selector);
          if (titleElement) {
            structure.title = await titleElement.textContent();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Extract course modules/sections
      const moduleSelectors = [
        '.curriculum-section',
        '.course-section',
        '.module',
        '.chapter',
        '[data-purpose="curriculum-section"]'
      ];

      for (const selector of moduleSelectors) {
        try {
          const modules = await this.client.page.$$(selector);
          for (const module of modules) {
            const moduleTitle = await module.$eval('h3, h4, .section-title', el => el.textContent.trim()).catch(() => '');
            const lessons = await module.$$('.curriculum-item, .lesson, .lecture').catch(() => []);
            
            structure.modules.push({
              title: moduleTitle,
              lessonCount: lessons.length
            });
            
            structure.totalLessons += lessons.length;
          }
          break;
        } catch (e) {
          continue;
        }
      }

      console.log(`Extracted structure: ${structure.modules.length} modules, ${structure.totalLessons} lessons`);
      return { success: true, structure };

    } catch (error) {
      console.error('Failed to extract course structure:', error.message);
      return { success: false, error: error.message };
    }
  }

  async navigateToFirstVideo() {
    try {
      console.log('Navigating to first video...');
      
      const videoSelectors = [
        '.curriculum-item:first-child a',
        '.lesson:first-child a',
        '.lecture:first-child a',
        '[data-purpose="curriculum-item"]:first-child a',
        '.video-item:first-child'
      ];

      for (const selector of videoSelectors) {
        try {
          const videoElement = await this.client.page.$(selector);
          if (videoElement) {
            await videoElement.click();
            await this.client.page.waitForTimeout(5000); // Wait for video to load
            console.log('Navigated to first video');
            return { success: true };
          }
        } catch (e) {
          continue;
        }
      }

      // Fallback to AI navigation
      const aiResult = await this.client.agent.ai('click on the first video or lesson in the course');
      return { success: true };

    } catch (error) {
      console.error('Failed to navigate to first video:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getVideoPlayerInfo() {
    try {
      const playerInfo = {
        duration: 0,
        currentTime: 0,
        isPlaying: false,
        hasControls: false
      };

      // Common video player selectors
      const playerSelectors = [
        'video',
        '.video-player video',
        '.player video',
        '[data-purpose="video-display"]'
      ];

      let videoElement = null;
      for (const selector of playerSelectors) {
        try {
          videoElement = await this.client.page.$(selector);
          if (videoElement) break;
        } catch (e) {
          continue;
        }
      }

      if (videoElement) {
        playerInfo.duration = await videoElement.evaluate(el => el.duration);
        playerInfo.currentTime = await videoElement.evaluate(el => el.currentTime);
        playerInfo.isPlaying = await videoElement.evaluate(el => !el.paused);
        playerInfo.hasControls = await videoElement.evaluate(el => el.controls);
      }

      return { success: true, playerInfo };

    } catch (error) {
      console.error('Failed to get video player info:', error.message);
      return { success: false, error: error.message };
    }
  }

  getCurrentNavigationState() {
    return { ...this.navigationState };
  }

  updateNavigationState(updates) {
    this.navigationState = { ...this.navigationState, ...updates };
  }
}

export default PlatformNavigator;