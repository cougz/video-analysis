import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import config from '../config/index.js';

export class ContentCaptureStrategy {
  constructor(midsceneClient) {
    this.client = midsceneClient;
    this.captureDir = path.join(process.cwd(), 'temp', 'captures');
    this.ensureCaptureDir();
  }

  async ensureCaptureDir() {
    await fs.ensureDir(this.captureDir);
  }

  async captureVideoFrames(duration, courseName = 'unknown') {
    const captures = [];
    const intervals = [0, 0.25, 0.5, 0.75, 0.95]; // Start, 25%, 50%, 75%, 95%
    
    console.log(`Capturing video frames for ${duration}s video...`);
    
    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const timestamp = interval * duration;
      
      try {
        // Seek to position
        const seekResult = await this.client.controlVideo('seek', { 
          position: `${Math.round(interval * 100)}%` 
        });
        
        if (!seekResult.success) {
          console.warn(`Failed to seek to ${interval * 100}%:`, seekResult.error);
          continue;
        }
        
        // Wait for video to stabilize
        await this.client.waitForVideoStable(3000);
        
        // Take screenshot
        const screenshotResult = await this.client.takeScreenshot();
        
        if (screenshotResult.success) {
          const filename = `${courseName}_video_${Math.round(timestamp)}s.png`;
          const filepath = path.join(this.captureDir, filename);
          
          // Save screenshot
          await fs.writeFile(filepath, screenshotResult.screenshot);
          
          // Convert to base64 for API
          const base64Image = screenshotResult.screenshot.toString('base64');
          
          captures.push({
            timestamp,
            percentage: interval * 100,
            filepath,
            base64: base64Image,
            context: 'video_frame',
            filename
          });
          
          console.log(`Captured frame at ${Math.round(timestamp)}s (${Math.round(interval * 100)}%)`);
        }
        
        // Small delay between captures
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error capturing frame at ${interval * 100}%:`, error.message);
      }
    }
    
    return captures;
  }

  async captureSlideTransitions(expectedSlideCount = 10) {
    const captures = [];
    let slideNumber = 1;
    
    console.log(`Capturing slide transitions (expecting ~${expectedSlideCount} slides)...`);
    
    while (slideNumber <= expectedSlideCount) {
      try {
        // Take screenshot of current slide
        const screenshotResult = await this.client.takeScreenshot({ fullPage: true });
        
        if (screenshotResult.success) {
          const filename = `slide_${slideNumber.toString().padStart(2, '0')}.png`;
          const filepath = path.join(this.captureDir, filename);
          
          await fs.writeFile(filepath, screenshotResult.screenshot);
          
          const base64Image = screenshotResult.screenshot.toString('base64');
          
          captures.push({
            slideNumber,
            filepath,
            base64: base64Image,
            context: 'slide_content',
            filename
          });
          
          console.log(`Captured slide ${slideNumber}`);
        }
        
        // Try to navigate to next slide
        const nextResult = await this.client.page.keyboard.press('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for transition
        
        slideNumber++;
        
      } catch (error) {
        console.error(`Error capturing slide ${slideNumber}:`, error.message);
        break;
      }
    }
    
    return captures;
  }

  async captureCodeExamples() {
    const captures = [];
    
    try {
      console.log('Capturing code examples and demonstrations...');
      
      // Look for code blocks or code demonstration areas
      const codeAreas = await this.client.page.$$('pre, code, .code-block, .highlight, .code-demo');
      
      for (let i = 0; i < codeAreas.length; i++) {
        try {
          // Scroll code area into view
          await codeAreas[i].scrollIntoViewIfNeeded();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Take screenshot of the code area
          const screenshot = await codeAreas[i].screenshot({ quality: 90 });
          
          if (screenshot) {
            const filename = `code_example_${i + 1}.png`;
            const filepath = path.join(this.captureDir, filename);
            
            await fs.writeFile(filepath, screenshot);
            
            const base64Image = screenshot.toString('base64');
            
            captures.push({
              index: i + 1,
              filepath,
              base64: base64Image,
              context: 'code_example',
              filename
            });
            
            console.log(`Captured code example ${i + 1}`);
          }
        } catch (error) {
          console.error(`Error capturing code example ${i + 1}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('Error in code capture process:', error.message);
    }
    
    return captures;
  }

  async captureAssessments() {
    const captures = [];
    
    try {
      console.log('Capturing quizzes and assessments...');
      
      // Look for quiz/assessment elements
      const assessmentSelectors = [
        '.quiz', '.assessment', '.question', '.exercise',
        '[data-testid*="quiz"]', '[data-testid*="question"]'
      ];
      
      for (const selector of assessmentSelectors) {
        const elements = await this.client.page.$$(selector);
        
        for (let i = 0; i < elements.length; i++) {
          try {
            await elements[i].scrollIntoViewIfNeeded();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const screenshot = await elements[i].screenshot({ quality: 90 });
            
            if (screenshot) {
              const filename = `assessment_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.png`;
              const filepath = path.join(this.captureDir, filename);
              
              await fs.writeFile(filepath, screenshot);
              
              const base64Image = screenshot.toString('base64');
              
              captures.push({
                type: selector,
                index: i + 1,
                filepath,
                base64: base64Image,
                context: 'assessment',
                filename
              });
              
              console.log(`Captured assessment: ${selector} #${i + 1}`);
            }
          } catch (error) {
            console.error(`Error capturing assessment ${selector} #${i + 1}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('Error in assessment capture process:', error.message);
    }
    
    return captures;
  }

  async captureFullPageContent() {
    try {
      console.log('Capturing full page content...');
      
      const screenshotResult = await this.client.takeScreenshot({ fullPage: true });
      
      if (screenshotResult.success) {
        const filename = `full_page_${Date.now()}.png`;
        const filepath = path.join(this.captureDir, filename);
        
        await fs.writeFile(filepath, screenshotResult.screenshot);
        
        const base64Image = screenshotResult.screenshot.toString('base64');
        
        return {
          filepath,
          base64: base64Image,
          context: 'full_page',
          filename
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error capturing full page:', error.message);
      return null;
    }
  }

  async optimizeImages(captures) {
    const optimized = [];
    
    for (const capture of captures) {
      try {
        if (capture.filepath && await fs.exists(capture.filepath)) {
          // Optimize image with Sharp
          const optimizedBuffer = await sharp(capture.filepath)
            .resize(1920, 1080, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .png({ 
              quality: config.browser.screenshotQuality,
              compressionLevel: 8 
            })
            .toBuffer();
          
          // Update base64
          capture.base64 = optimizedBuffer.toString('base64');
          capture.optimized = true;
          
          optimized.push(capture);
        }
      } catch (error) {
        console.error(`Error optimizing image ${capture.filename}:`, error.message);
        optimized.push(capture); // Keep original if optimization fails
      }
    }
    
    return optimized;
  }

  async cleanup() {
    try {
      await fs.remove(this.captureDir);
      console.log('Cleaned up temporary capture files');
    } catch (error) {
      console.error('Error cleaning up captures:', error.message);
    }
  }
}

export default ContentCaptureStrategy;