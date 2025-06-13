export class UniversalVideoHandler {
  constructor(midsceneClient) {
    this.client = midsceneClient;
    this.playerInfo = null;
    this.controlsMapping = {};
  }

  async detectAndControlVideo() {
    try {
      console.log('🎥 Detecting video player...');
      
      // Use AI to analyze the page and identify video player
      const playerAnalysis = await this.client.ai(`
        Analyze this page and identify any video player. Tell me:
        1. What type of video player is present? (YouTube, Vimeo, HTML5, custom player, etc.)
        2. Where are the video controls located?
        3. What controls are available? (play, pause, seek bar, volume, etc.)
        4. What is the current state? (playing, paused, loading, etc.)
        5. Can you see the video duration or current time?
        
        Describe the player in detail.
      `);
      
      // Extract player information
      this.playerInfo = await this.analyzePlayerCapabilities();
      
      if (!this.playerInfo.detected) {
        throw new Error('No video player detected on the page');
      }
      
      console.log(`✅ Detected ${this.playerInfo.type} player`);
      
      // Return control interface
      return {
        play: () => this.playVideo(),
        pause: () => this.pauseVideo(),
        seek: (percentage) => this.seekToPosition(percentage),
        setVolume: (level) => this.setVolume(level),
        getCurrentTime: () => this.getCurrentTime(),
        getDuration: () => this.getDuration(),
        isPlaying: () => this.isPlaying(),
        getPlayerInfo: () => this.getPlayerInfo(),
        waitForStable: (timeout) => this.waitForVideoStable(timeout)
      };
      
    } catch (error) {
      console.error('Video detection failed:', error.message);
      throw error;
    }
  }

  async analyzePlayerCapabilities() {
    try {
      // Use AI to understand what we can do with this player
      const capabilityAnalysis = await this.client.ai(`
        Look at the video player on this page and identify:
        1. Is there a play button? Where is it?
        2. Is there a pause button? Where is it?
        3. Is there a progress/seek bar? Can I click on it?
        4. Are there volume controls?
        5. Can I see time information (current time, duration)?
        6. Are there speed controls?
        7. Is there a fullscreen button?
        
        Describe each control and its location precisely.
      `);
      
      return {
        detected: true,
        type: await this.identifyPlayerType(),
        hasPlayButton: capabilityAnalysis.toLowerCase().includes('play'),
        hasPauseButton: capabilityAnalysis.toLowerCase().includes('pause'),
        hasSeekBar: capabilityAnalysis.toLowerCase().includes('seek') || capabilityAnalysis.toLowerCase().includes('progress'),
        hasVolumeControl: capabilityAnalysis.toLowerCase().includes('volume'),
        hasTimeDisplay: capabilityAnalysis.toLowerCase().includes('time') || capabilityAnalysis.toLowerCase().includes('duration'),
        hasSpeedControl: capabilityAnalysis.toLowerCase().includes('speed'),
        hasFullscreen: capabilityAnalysis.toLowerCase().includes('fullscreen'),
        capabilities: capabilityAnalysis
      };
      
    } catch (error) {
      console.error('Player capability analysis failed:', error.message);
      return { detected: false, error: error.message };
    }
  }

  async identifyPlayerType() {
    try {
      // Use AI to identify the specific type of player
      const typeIdentification = await this.client.ai(`
        What type of video player is this? Look for:
        - YouTube player (has YouTube logo, red progress bar)
        - Vimeo player (Vimeo branding, blue elements)
        - HTML5 video element (browser default controls)
        - Custom player (unique design, branded)
        - Embedded player (iframe, different domain)
        
        Respond with just the player type name.
      `);
      
      const playerType = typeIdentification.toLowerCase();
      if (playerType.includes('youtube')) return 'youtube';
      if (playerType.includes('vimeo')) return 'vimeo';
      if (playerType.includes('html5')) return 'html5';
      if (playerType.includes('custom')) return 'custom';
      return 'unknown';
      
    } catch (error) {
      console.error('Player type identification failed:', error.message);
      return 'unknown';
    }
  }

  async playVideo() {
    try {
      console.log('▶️ Playing video...');
      
      const result = await this.client.ai(`
        Find and click the play button on the video player.
        Look for:
        - Triangle/arrow pointing right
        - "Play" text or icon
        - Large play button overlay on video
        
        Click on it to start the video.
      `);
      
      await this.client.page.waitForTimeout(1000);
      return { success: true };
      
    } catch (error) {
      console.error('Play failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async pauseVideo() {
    try {
      console.log('⏸️ Pausing video...');
      
      const result = await this.client.ai(`
        Find and click the pause button on the video player.
        Look for:
        - Two vertical bars (pause icon)
        - "Pause" text
        - Same location as the play button
        
        Click on it to pause the video.
      `);
      
      await this.client.page.waitForTimeout(1000);
      return { success: true };
      
    } catch (error) {
      console.error('Pause failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async seekToPosition(percentage) {
    try {
      console.log(`⏩ Seeking to ${percentage}%...`);
      
      const result = await this.client.ai(`
        I want to seek the video to ${percentage}% of its duration.
        
        Find the progress bar or seek bar and click at the position that represents ${percentage}% of the total length.
        The seek bar is usually a horizontal bar that shows video progress.
        
        Click at the appropriate position to seek to ${percentage}%.
      `);
      
      await this.client.page.waitForTimeout(2000); // Wait for seek to complete
      return { success: true, position: percentage };
      
    } catch (error) {
      console.error('Seek failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async setVolume(level) {
    try {
      console.log(`🔊 Setting volume to ${level}%...`);
      
      const result = await this.client.ai(`
        I want to set the video volume to ${level}%.
        
        Find the volume control (usually a speaker icon with a slider) and adjust it to ${level}%.
        You might need to hover over the volume icon first to reveal the slider.
      `);
      
      await this.client.page.waitForTimeout(500);
      return { success: true, volume: level };
      
    } catch (error) {
      console.error('Volume adjustment failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getCurrentTime() {
    try {
      const timeInfo = await this.client.ai(`
        Look at the video player and find the current time display.
        Usually shows format like "2:30" or "0:45" or "1:23:45".
        
        What is the current time position of the video?
        Respond with just the time value.
      `);
      
      // Parse time string to seconds
      const seconds = this.parseTimeToSeconds(timeInfo);
      return { success: true, currentTime: seconds, displayTime: timeInfo };
      
    } catch (error) {
      console.error('Get current time failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getDuration() {
    try {
      const durationInfo = await this.client.ai(`
        Look at the video player and find the total duration display.
        Usually shows format like "10:30" or "1:45:20" representing the total video length.
        
        What is the total duration of the video?
        Respond with just the duration value.
      `);
      
      // Parse duration string to seconds
      const seconds = this.parseTimeToSeconds(durationInfo);
      return { success: true, duration: seconds, displayDuration: durationInfo };
      
    } catch (error) {
      console.error('Get duration failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async isPlaying() {
    try {
      const playingStatus = await this.client.ai(`
        Look at the video player and determine:
        1. Is the video currently playing? (look for pause button visible)
        2. Is the video paused? (look for play button visible)
        3. Is the video loading/buffering?
        
        Respond with: PLAYING, PAUSED, or LOADING
      `);
      
      const isCurrentlyPlaying = playingStatus.includes('PLAYING');
      return { success: true, isPlaying: isCurrentlyPlaying, status: playingStatus };
      
    } catch (error) {
      console.error('Playing status check failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async waitForVideoStable(timeout = 3000) {
    try {
      console.log('⏳ Waiting for video to stabilize...');
      
      // Use AI to detect when video is stable and ready
      const stabilityCheck = await this.client.ai(`
        Check if the video is stable and ready:
        1. Is the video loaded and not buffering?
        2. Are the controls visible and responsive?
        3. Is the video frame clear and not pixelated?
        4. Can I see the current frame properly?
        
        Respond with: STABLE or NOT_STABLE
      `);
      
      if (stabilityCheck.includes('STABLE')) {
        return { success: true, stable: true };
      }
      
      // Wait a bit more and check again
      await this.client.page.waitForTimeout(1000);
      return { success: true, stable: false, retryNeeded: true };
      
    } catch (error) {
      console.error('Video stability check failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async captureCurrentFrame() {
    try {
      console.log('📸 Capturing current video frame...');
      
      // First ensure video area is visible
      await this.client.ai('Make sure the video player is visible on screen');
      
      // Take screenshot of the video area
      const screenshot = await this.client.takeScreenshot();
      
      if (screenshot.success) {
        return {
          success: true,
          screenshot: screenshot.screenshot,
          timestamp: await this.getCurrentTime()
        };
      }
      
      throw new Error('Screenshot capture failed');
      
    } catch (error) {
      console.error('Frame capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  parseTimeToSeconds(timeString) {
    try {
      // Clean the time string
      const cleanTime = timeString.replace(/[^\d:]/g, '');
      const parts = cleanTime.split(':').reverse();
      
      let seconds = 0;
      if (parts[0]) seconds += parseInt(parts[0]); // seconds
      if (parts[1]) seconds += parseInt(parts[1]) * 60; // minutes
      if (parts[2]) seconds += parseInt(parts[2]) * 3600; // hours
      
      return seconds;
    } catch (error) {
      console.error('Time parsing failed:', error.message);
      return 0;
    }
  }

  getPlayerInfo() {
    return this.playerInfo;
  }

  async handlePlayerSpecificFeatures() {
    if (!this.playerInfo || !this.playerInfo.type) {
      return { success: false, error: 'Player info not available' };
    }

    try {
      // Handle platform-specific features dynamically
      const featureAnalysis = await this.client.ai(`
        This is a ${this.playerInfo.type} video player. 
        What special features or controls are unique to this type of player?
        
        Look for:
        - Quality settings
        - Playback speed controls
        - Captions/subtitles
        - Chapter markers
        - Picture-in-picture
        - Any other unique features
        
        Describe what's available and how to access these features.
      `);

      return { success: true, features: featureAnalysis };
      
    } catch (error) {
      console.error('Player feature analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default UniversalVideoHandler;