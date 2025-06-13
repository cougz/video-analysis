import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import config from '../config/index.js';

export class AdaptiveCaptureStrategy {
  constructor(midsceneClient) {
    this.client = midsceneClient;
    this.captureDir = path.join(process.cwd(), 'temp', 'captures');
    this.captureHistory = [];
    this.ensureCaptureDir();
  }

  async ensureCaptureDir() {
    await fs.ensureDir(this.captureDir);
  }

  async determineCapturePlan(videoInfo, userPrompt) {
    console.log(`🎯 Creating adaptive capture plan for: "${userPrompt}"`);
    
    try {
      // Use AI to analyze the request and determine optimal capture strategy
      const strategyAnalysis = await this.client.agent.ai(`
        I need to capture frames from a video to analyze: "${userPrompt}"
        
        Video information:
        - Duration: ${videoInfo?.duration || 'unknown'} seconds
        - Type: ${videoInfo?.type || 'unknown'}
        
        Based on the user's request, recommend:
        1. How many frames should I capture? (consider the request type and video length)
        2. What capture strategy is best? (time-based, content-based, event-based)
        3. Should I focus on specific moments? (beginning, middle, end, transitions)
        4. What intervals or timing would be most effective?
        5. Any special considerations for this type of analysis?
        
        Provide a strategic recommendation for optimal frame capture.
      `);
      
      // Create capture plan based on AI recommendation and request type
      const basePlan = this.createBasePlan(videoInfo, userPrompt);
      const aiEnhancedPlan = this.enhancePlanWithAI(basePlan, strategyAnalysis);
      
      console.log(`📋 Capture plan: ${aiEnhancedPlan.capturePoints.length} frames over ${videoInfo?.duration || 'unknown'}s`);
      
      return aiEnhancedPlan;
      
    } catch (error) {
      console.error('❌ Capture planning failed:', error.message);
      // Fallback to simple plan
      return this.createSimpleFallbackPlan(videoInfo);
    }
  }

  createBasePlan(videoInfo, userPrompt) {
    const prompt = userPrompt.toLowerCase();
    const duration = videoInfo?.duration || 300; // Default 5 minutes
    
    // Analyze request type to determine capture strategy
    if (prompt.includes('summarize') || prompt.includes('overview')) {
      return this.createSummaryCapturePlan(duration);
    }
    
    if (prompt.includes('timeline') || prompt.includes('progression')) {
      return this.createTimelineCapturePlan(duration);
    }
    
    if (prompt.includes('code') || prompt.includes('programming')) {
      return this.createCodeCapturePlan(duration);
    }
    
    if (prompt.includes('slide') || prompt.includes('presentation')) {
      return this.createSlideCapturePlan(duration);
    }
    
    if (prompt.includes('teaching') || prompt.includes('educational')) {
      return this.createEducationalCapturePlan(duration);
    }
    
    // Default comprehensive plan
    return this.createComprehensiveCapturePlan(duration);
  }

  createSummaryCapturePlan(duration) {
    // For summaries, capture key moments throughout the video
    const capturePoints = [
      { type: 'timestamp', value: 0, reason: 'Introduction/opening' },
      { type: 'timestamp', value: duration * 0.2, reason: 'Early content sample' },
      { type: 'timestamp', value: duration * 0.5, reason: 'Mid-point content' },
      { type: 'timestamp', value: duration * 0.8, reason: 'Late content sample' },
      { type: 'timestamp', value: Math.max(duration - 30, duration * 0.95), reason: 'Conclusion/summary' }
    ];
    
    return {
      strategy: 'summary',
      totalFrames: capturePoints.length,
      capturePoints,
      optimizeFor: 'content_diversity'
    };
  }

  createTimelineCapturePlan(duration) {
    // For timelines, capture more frequent, evenly spaced frames
    const interval = Math.max(30, duration / 10); // Every 30s or 10 frames max
    const capturePoints = [];
    
    for (let time = 0; time < duration; time += interval) {
      capturePoints.push({
        type: 'timestamp',
        value: time,
        reason: `Timeline point at ${Math.round(time)}s`
      });
    }
    
    return {
      strategy: 'timeline',
      totalFrames: capturePoints.length,
      capturePoints,
      optimizeFor: 'temporal_progression'
    };
  }

  createCodeCapturePlan(duration) {
    // For code content, focus on moments when code is likely visible
    const capturePoints = [
      { type: 'event', description: 'code editor or IDE visible', reason: 'Code demonstration start' },
      { type: 'timestamp', value: duration * 0.25, reason: 'Early code examples' },
      { type: 'timestamp', value: duration * 0.5, reason: 'Mid-content code' },
      { type: 'timestamp', value: duration * 0.75, reason: 'Advanced code examples' },
      { type: 'event', description: 'terminal or console output', reason: 'Code execution results' }
    ];
    
    return {
      strategy: 'code_focused',
      totalFrames: capturePoints.length,
      capturePoints,
      optimizeFor: 'code_visibility'
    };
  }

  createSlideCapturePlan(duration) {
    // For slides, capture on slide transitions
    return {
      strategy: 'slide_transitions',
      totalFrames: 'dynamic', // Will be determined during capture
      capturePoints: [
        { type: 'event', description: 'slide transition detected', reason: 'New slide content' }
      ],
      optimizeFor: 'slide_content'
    };
  }

  createEducationalCapturePlan(duration) {
    // For educational content, balanced approach with key learning moments
    const capturePoints = [
      { type: 'timestamp', value: 0, reason: 'Learning objectives introduction' },
      { type: 'timestamp', value: duration * 0.15, reason: 'Core concept introduction' },
      { type: 'timestamp', value: duration * 0.35, reason: 'Example or demonstration' },
      { type: 'timestamp', value: duration * 0.55, reason: 'Practice or application' },
      { type: 'timestamp', value: duration * 0.75, reason: 'Advanced concepts' },
      { type: 'timestamp', value: duration * 0.9, reason: 'Summary or conclusion' }
    ];
    
    return {
      strategy: 'educational',
      totalFrames: capturePoints.length,
      capturePoints,
      optimizeFor: 'learning_progression'
    };
  }

  createComprehensiveCapturePlan(duration) {
    // Default plan with good coverage
    const capturePoints = [
      { type: 'timestamp', value: 0, reason: 'Opening content' },
      { type: 'timestamp', value: duration * 0.2, reason: 'Early content' },
      { type: 'timestamp', value: duration * 0.4, reason: 'First half content' },
      { type: 'timestamp', value: duration * 0.6, reason: 'Second half content' },
      { type: 'timestamp', value: duration * 0.8, reason: 'Late content' },
      { type: 'timestamp', value: Math.max(duration - 10, duration * 0.95), reason: 'Closing content' }
    ];
    
    return {
      strategy: 'comprehensive',
      totalFrames: capturePoints.length,
      capturePoints,
      optimizeFor: 'balanced_coverage'
    };
  }

  enhancePlanWithAI(basePlan, aiRecommendation) {
    // AI might suggest modifications to the base plan
    // For now, we'll use the base plan but this could be enhanced
    // to parse AI recommendations and modify the plan accordingly
    
    return {
      ...basePlan,
      aiEnhancement: aiRecommendation,
      enhanced: true
    };
  }

  createSimpleFallbackPlan(videoInfo) {
    const duration = videoInfo?.duration || 300;
    return {
      strategy: 'fallback',
      totalFrames: 3,
      capturePoints: [
        { type: 'timestamp', value: 0, reason: 'Start' },
        { type: 'timestamp', value: duration * 0.5, reason: 'Middle' },
        { type: 'timestamp', value: duration * 0.9, reason: 'End' }
      ],
      optimizeFor: 'basic_coverage'
    };
  }

  async captureFrames(videoHandler, strategy, userPrompt) {
    console.log(`📸 Starting adaptive frame capture using ${strategy.strategy} strategy...`);
    
    const frames = [];
    let captureCount = 0;
    
    try {
      for (const capturePoint of strategy.capturePoints) {
        try {
          captureCount++;
          console.log(`📷 Capturing frame ${captureCount}/${strategy.capturePoints.length}: ${capturePoint.reason}`);
          
          let captureResult = null;
          
          if (capturePoint.type === 'timestamp') {
            captureResult = await this.captureAtTimestamp(videoHandler, capturePoint, captureCount);
          } else if (capturePoint.type === 'event') {
            captureResult = await this.captureOnEvent(videoHandler, capturePoint, captureCount);
          }
          
          if (captureResult) {
            // Enhance frame with analysis metadata
            captureResult.userPrompt = userPrompt;
            captureResult.captureStrategy = strategy.strategy;
            captureResult.captureReason = capturePoint.reason;
            
            frames.push(captureResult);
            this.captureHistory.push(captureResult);
          }
          
        } catch (error) {
          console.error(`❌ Failed to capture frame ${captureCount}:`, error.message);
          continue;
        }
      }
      
      // Handle special strategies that require dynamic capture
      if (strategy.strategy === 'slide_transitions') {
        const slideFrames = await this.captureSlideTransitions(videoHandler, userPrompt);
        frames.push(...slideFrames);
      }
      
      console.log(`✅ Adaptive capture completed: ${frames.length} frames captured`);
      return frames;
      
    } catch (error) {
      console.error('❌ Adaptive capture failed:', error.message);
      return frames; // Return whatever we managed to capture
    }
  }

  async captureAtTimestamp(videoHandler, capturePoint, frameNumber) {
    try {
      // Calculate percentage for seeking
      const videoInfo = await videoHandler.getDuration();
      if (!videoInfo.success) {
        throw new Error('Could not get video duration');
      }
      
      const percentage = (capturePoint.value / videoInfo.duration) * 100;
      
      // Seek to position
      const seekResult = await videoHandler.seek(percentage);
      if (!seekResult.success) {
        throw new Error(`Seek failed: ${seekResult.error}`);
      }
      
      // Wait for video to stabilize
      await videoHandler.waitForStable(3000);
      
      // Capture frame
      const screenshotResult = await videoHandler.captureCurrentFrame();
      if (!screenshotResult.success) {
        throw new Error(`Screenshot failed: ${screenshotResult.error}`);
      }
      
      // Save and process the frame
      const filename = `adaptive_frame_${frameNumber}_${Math.round(capturePoint.value)}s.png`;
      const filepath = path.join(this.captureDir, filename);
      
      await fs.writeFile(filepath, screenshotResult.screenshot);
      
      return {
        timestamp: capturePoint.value,
        percentage,
        filepath,
        base64: screenshotResult.screenshot.toString('base64'),
        context: 'adaptive_timestamp',
        filename,
        frameNumber
      };
      
    } catch (error) {
      throw new Error(`Timestamp capture failed: ${error.message}`);
    }
  }

  async captureOnEvent(videoHandler, capturePoint, frameNumber) {
    try {
      console.log(`🔍 Waiting for event: ${capturePoint.description}`);
      
      // Use AI to detect the specified event
      const eventDetected = await this.client.agent.ai(`
        I'm looking for this event in the video: "${capturePoint.description}"
        
        Watch the current video frame and tell me:
        1. Can you see ${capturePoint.description}?
        2. Is this the right moment to capture for this event?
        3. Should I wait longer or capture now?
        
        Respond with: CAPTURE_NOW, WAIT_LONGER, or EVENT_NOT_FOUND
      `);
      
      if (eventDetected.includes('CAPTURE_NOW')) {
        const screenshotResult = await videoHandler.captureCurrentFrame();
        if (!screenshotResult.success) {
          throw new Error(`Event screenshot failed: ${screenshotResult.error}`);
        }
        
        const filename = `adaptive_event_${frameNumber}_${capturePoint.description.replace(/\s+/g, '_')}.png`;
        const filepath = path.join(this.captureDir, filename);
        
        await fs.writeFile(filepath, screenshotResult.screenshot);
        
        return {
          timestamp: await videoHandler.getCurrentTime(),
          filepath,
          base64: screenshotResult.screenshot.toString('base64'),
          context: 'adaptive_event',
          filename,
          frameNumber,
          eventDescription: capturePoint.description
        };
      } else {
        console.log(`⏳ Event not ready, skipping: ${capturePoint.description}`);
        return null;
      }
      
    } catch (error) {
      throw new Error(`Event capture failed: ${error.message}`);
    }
  }

  async captureSlideTransitions(videoHandler, userPrompt) {
    console.log('📊 Capturing slide transitions...');
    
    const slideFrames = [];
    let slideCount = 0;
    let previousFrame = null;
    
    try {
      // Start from beginning
      await videoHandler.seek(0);
      await videoHandler.waitForStable(2000);
      
      const videoInfo = await videoHandler.getDuration();
      const duration = videoInfo.success ? videoInfo.duration : 300;
      
      // Sample frames every 10 seconds to detect slide changes
      const sampleInterval = 10;
      
      for (let time = 0; time < duration; time += sampleInterval) {
        const percentage = (time / duration) * 100;
        await videoHandler.seek(percentage);
        await videoHandler.waitForStable(1000);
        
        const currentFrame = await videoHandler.captureCurrentFrame();
        if (!currentFrame.success) continue;
        
        // Use AI to detect if this is a new slide
        if (previousFrame) {
          const slideChangeDetection = await this.client.agent.ai(`
            Compare these two frames to detect if there's a slide transition.
            
            Look for:
            1. Different slide content
            2. New headings or titles
            3. Different layout or structure
            4. Significant visual changes
            
            Respond with: NEW_SLIDE or SAME_SLIDE
          `);
          
          if (slideChangeDetection.includes('NEW_SLIDE')) {
            slideCount++;
            const filename = `slide_${slideCount.toString().padStart(2, '0')}_${Math.round(time)}s.png`;
            const filepath = path.join(this.captureDir, filename);
            
            await fs.writeFile(filepath, currentFrame.screenshot);
            
            slideFrames.push({
              timestamp: time,
              percentage,
              filepath,
              base64: currentFrame.screenshot.toString('base64'),
              context: 'slide_transition',
              filename,
              slideNumber: slideCount
            });
            
            console.log(`📄 Captured slide ${slideCount} at ${Math.round(time)}s`);
          }
        } else {
          // First slide
          slideCount = 1;
          const filename = `slide_01_${Math.round(time)}s.png`;
          const filepath = path.join(this.captureDir, filename);
          
          await fs.writeFile(filepath, currentFrame.screenshot);
          
          slideFrames.push({
            timestamp: time,
            percentage,
            filepath,
            base64: currentFrame.screenshot.toString('base64'),
            context: 'slide_transition',
            filename,
            slideNumber: slideCount
          });
        }
        
        previousFrame = currentFrame;
      }
      
      console.log(`📊 Captured ${slideFrames.length} slides`);
      return slideFrames;
      
    } catch (error) {
      console.error('❌ Slide transition capture failed:', error.message);
      return slideFrames;
    }
  }

  async optimizeCaptures(frames, strategy) {
    console.log(`🔧 Optimizing ${frames.length} captures for ${strategy.optimizeFor}...`);
    
    const optimized = [];
    
    for (const frame of frames) {
      try {
        if (frame.filepath && await fs.exists(frame.filepath)) {
          // Determine optimization parameters based on strategy
          const optimizationParams = this.getOptimizationParams(strategy.optimizeFor);
          
          const optimizedBuffer = await sharp(frame.filepath)
            .resize(optimizationParams.width, optimizationParams.height, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .png({
              quality: optimizationParams.quality,
              compressionLevel: optimizationParams.compression
            })
            .toBuffer();
          
          // Update frame data
          frame.base64 = optimizedBuffer.toString('base64');
          frame.optimized = true;
          frame.optimizationStrategy = strategy.optimizeFor;
          
          optimized.push(frame);
        }
      } catch (error) {
        console.error(`❌ Optimization failed for ${frame.filename}:`, error.message);
        optimized.push(frame); // Keep original
      }
    }
    
    return optimized;
  }

  getOptimizationParams(strategy) {
    const params = {
      content_diversity: { width: 1920, height: 1080, quality: 90, compression: 6 },
      temporal_progression: { width: 1600, height: 900, quality: 85, compression: 7 },
      code_visibility: { width: 1920, height: 1080, quality: 95, compression: 5 },
      slide_content: { width: 1920, height: 1080, quality: 90, compression: 6 },
      learning_progression: { width: 1600, height: 900, quality: 88, compression: 6 },
      balanced_coverage: { width: 1600, height: 900, quality: 85, compression: 7 },
      basic_coverage: { width: 1280, height: 720, quality: 80, compression: 8 }
    };
    
    return params[strategy] || params.balanced_coverage;
  }

  async cleanup() {
    try {
      await fs.remove(this.captureDir);
      console.log('🧹 Cleaned up adaptive capture files');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  getCaptureStats() {
    return {
      totalCaptures: this.captureHistory.length,
      strategiesUsed: [...new Set(this.captureHistory.map(c => c.captureStrategy))],
      lastCaptureTime: this.captureHistory.length > 0 ? 
        this.captureHistory[this.captureHistory.length - 1].timestamp : null
    };
  }
}

export default AdaptiveCaptureStrategy;