import { ovhClient } from '../config/ovhcloud.js';
import config from '../config/index.js';

export class VLMAnalyzer {
  constructor() {
    this.client = ovhClient;
    this.analysisCache = new Map();
  }

  async analyzeContentBatch(screenshots, analysisType = 'comprehensive') {
    const results = [];
    const batchSize = config.analysis.maxConcurrent;
    const prompt = this.getPromptForAnalysis(analysisType);
    
    console.log(`Starting batch analysis of ${screenshots.length} screenshots...`);
    
    for (let i = 0; i < screenshots.length; i += batchSize) {
      const batch = screenshots.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(screenshots.length / batchSize)}`);
      
      const batchPromises = batch.map(async (screenshot, index) => {
        try {
          const cacheKey = `${screenshot.filename}_${analysisType}`;
          
          // Check cache first
          if (config.cache.enabled && this.analysisCache.has(cacheKey)) {
            console.log(`Using cached analysis for ${screenshot.filename}`);
            return this.analysisCache.get(cacheKey);
          }
          
          const analysis = await this.client.analyzeImage(
            screenshot.base64,
            prompt,
            { maxTokens: 1500, temperature: 0.1 }
          );
          
          if (analysis.success) {
            const result = {
              filename: screenshot.filename,
              context: screenshot.context,
              timestamp: screenshot.timestamp,
              analysis: analysis.analysis,
              usage: analysis.usage,
              analysisType,
              processedAt: new Date().toISOString()
            };
            
            // Cache the result
            if (config.cache.enabled) {
              this.analysisCache.set(cacheKey, result);
            }
            
            console.log(`✓ Analyzed ${screenshot.filename}`);
            return result;
          } else {
            console.error(`✗ Failed to analyze ${screenshot.filename}:`, analysis.error);
            return {
              filename: screenshot.filename,
              context: screenshot.context,
              error: analysis.error,
              analysisType
            };
          }
        } catch (error) {
          console.error(`Error analyzing ${screenshot.filename}:`, error.message);
          return {
            filename: screenshot.filename,
            context: screenshot.context,
            error: error.message,
            analysisType
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting pause between batches
      if (i + batchSize < screenshots.length) {
        console.log('Pausing between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Completed batch analysis: ${results.filter(r => !r.error).length}/${results.length} successful`);
    return results;
  }

  async performComprehensiveAnalysis(screenshots) {
    const analysisTypes = ['technicalAccuracy', 'visualQuality', 'educationalValue', 'contentExtraction'];
    const comprehensiveResults = {};
    
    for (const analysisType of analysisTypes) {
      console.log(`\nPerforming ${analysisType} analysis...`);
      comprehensiveResults[analysisType] = await this.analyzeContentBatch(screenshots, analysisType);
    }
    
    return comprehensiveResults;
  }

  getPromptForAnalysis(analysisType) {
    const prompts = config.prompts;
    
    switch (analysisType) {
      case 'technicalAccuracy':
        return prompts.technicalAccuracy;
      case 'visualQuality':
        return prompts.visualQuality;
      case 'educationalValue':
        return prompts.educationalValue;
      case 'contentExtraction':
        return prompts.contentExtraction;
      case 'comprehensive':
        return `Please provide a comprehensive analysis of this educational content including:
1. Technical accuracy and correctness
2. Visual quality and presentation
3. Educational effectiveness
4. Key content summary
5. Specific areas for improvement
6. Overall rating (1-10)

Provide structured, actionable feedback.`;
      default:
        return prompts.contentExtraction;
    }
  }

  async analyzeVideoSequence(videoFrames) {
    const sequenceAnalysis = {
      continuity: '',
      progression: '',
      keyMoments: [],
      overallFlow: ''
    };
    
    // Analyze sequence continuity
    const continuityPrompt = `Analyze this sequence of video frames for:
1. Content continuity and flow
2. Logical progression of topics
3. Key transition points
4. Overall narrative structure
Rate the sequence flow from 1-10 and identify any issues.`;
    
    const frameTexts = videoFrames.map(frame => frame.base64).slice(0, 5); // Limit to 5 frames for sequence analysis
    
    if (frameTexts.length > 0) {
      const result = await this.client.analyzeImage(frameTexts[0], continuityPrompt);
      if (result.success) {
        sequenceAnalysis.continuity = result.analysis;
      }
    }
    
    // Identify key moments
    for (const frame of videoFrames) {
      const keyMomentPrompt = `Identify if this frame represents a key learning moment:
1. Is this a crucial concept explanation?
2. Does it show important code or examples?
3. Is this a transition to new topics?
4. Are there any issues visible?
Respond with: KEY_MOMENT, TRANSITION, NORMAL, or ISSUE and explain briefly.`;
      
      const analysis = await this.client.analyzeImage(frame.base64, keyMomentPrompt);
      if (analysis.success && analysis.analysis.includes('KEY_MOMENT')) {
        sequenceAnalysis.keyMoments.push({
          timestamp: frame.timestamp,
          description: analysis.analysis,
          filename: frame.filename
        });
      }
    }
    
    return sequenceAnalysis;
  }

  generateAnalysisSummary(analysisResults) {
    const summary = {
      totalScreenshots: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      averageScores: {},
      keyIssues: [],
      strengths: [],
      overallRecommendations: []
    };
    
    // Count totals
    Object.values(analysisResults).forEach(typeResults => {
      if (Array.isArray(typeResults)) {
        summary.totalScreenshots += typeResults.length;
        summary.successfulAnalyses += typeResults.filter(r => !r.error).length;
        summary.failedAnalyses += typeResults.filter(r => r.error).length;
      }
    });
    
    // Extract scores and issues from analyses
    Object.entries(analysisResults).forEach(([type, results]) => {
      if (Array.isArray(results)) {
        const scores = [];
        const issues = [];
        const positives = [];
        
        results.forEach(result => {
          if (result.analysis && !result.error) {
            // Extract numerical ratings
            const ratingMatch = result.analysis.match(/(\d+)\/10|\b(\d+)\s*out\s*of\s*10|\brating[:\s]*(\d+)/i);
            if (ratingMatch) {
              const score = parseInt(ratingMatch[1] || ratingMatch[2] || ratingMatch[3]);
              if (score >= 1 && score <= 10) {
                scores.push(score);
              }
            }
            
            // Extract issues (look for negative keywords)
            const issueKeywords = ['error', 'incorrect', 'issue', 'problem', 'poor', 'unclear', 'confusing'];
            if (issueKeywords.some(keyword => result.analysis.toLowerCase().includes(keyword))) {
              issues.push({
                context: result.context,
                filename: result.filename,
                issue: result.analysis.split('.')[0] // First sentence
              });
            }
            
            // Extract positives
            const positiveKeywords = ['excellent', 'good', 'clear', 'effective', 'well', 'accurate'];
            if (positiveKeywords.some(keyword => result.analysis.toLowerCase().includes(keyword))) {
              positives.push({
                context: result.context,
                filename: result.filename,
                strength: result.analysis.split('.')[0]
              });
            }
          }
        });
        
        if (scores.length > 0) {
          summary.averageScores[type] = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
        
        summary.keyIssues.push(...issues);
        summary.strengths.push(...positives);
      }
    });
    
    // Generate overall recommendations
    const overallScore = Object.values(summary.averageScores).reduce((a, b) => a + b, 0) / Object.keys(summary.averageScores).length;
    
    if (overallScore < 6) {
      summary.overallRecommendations.push('Significant improvements needed in content quality and presentation');
    } else if (overallScore < 8) {
      summary.overallRecommendations.push('Good content with room for enhancement');
    } else {
      summary.overallRecommendations.push('High-quality content with minor optimization opportunities');
    }
    
    if (summary.keyIssues.length > summary.totalScreenshots * 0.3) {
      summary.overallRecommendations.push('Address technical accuracy and clarity issues');
    }
    
    return summary;
  }
}

export default VLMAnalyzer;