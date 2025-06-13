import { ovhClient } from '../config/ovhcloud.js';
import config from '../config/index.js';

export class DynamicAnalyzer {
  constructor() {
    this.client = ovhClient;
    this.analysisCache = new Map();
  }

  async analyzeContent(userPrompt, capturedFrames) {
    console.log(`🧠 Starting dynamic analysis for: "${userPrompt}"`);
    
    try {
      // Validate inputs
      if (!userPrompt || !capturedFrames || capturedFrames.length === 0) {
        throw new Error('Invalid analysis inputs');
      }

      const analysisResults = [];
      
      // Analyze each frame with the user's specific request
      console.log(`📸 Analyzing ${capturedFrames.length} frames...`);
      
      for (let i = 0; i < capturedFrames.length; i++) {
        const frame = capturedFrames[i];
        console.log(`🔍 Analyzing frame ${i + 1}/${capturedFrames.length}: ${frame.filename || 'unnamed'}`);
        
        try {
          const frameAnalysis = await this.analyzeFrame(frame, userPrompt, i + 1);
          analysisResults.push(frameAnalysis);
        } catch (error) {
          console.error(`❌ Frame analysis failed for ${frame.filename}:`, error.message);
          analysisResults.push({
            frame: frame.filename || `frame_${i + 1}`,
            timestamp: frame.timestamp,
            error: error.message,
            userPrompt
          });
        }
      }
      
      // Synthesize all frame analyses according to user's request
      console.log('🔮 Synthesizing comprehensive results...');
      const synthesizedResult = await this.synthesizeResults(userPrompt, analysisResults);
      
      return {
        success: true,
        userPrompt,
        totalFrames: capturedFrames.length,
        frameAnalyses: analysisResults,
        synthesizedResult,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Dynamic analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        userPrompt,
        processedAt: new Date().toISOString()
      };
    }
  }

  async analyzeFrame(frame, userPrompt, frameNumber) {
    try {
      // Create frame-specific analysis prompt
      const framePrompt = this.createFramePrompt(userPrompt, frame, frameNumber);
      
      // Check cache first
      const cacheKey = `${frame.filename || frameNumber}_${this.hashPrompt(userPrompt)}`;
      if (config.cache?.enabled && this.analysisCache.has(cacheKey)) {
        console.log(`📦 Using cached analysis for frame ${frameNumber}`);
        return this.analysisCache.get(cacheKey);
      }
      
      // Perform AI analysis
      const analysis = await this.client.analyzeImage(
        frame.base64 || frame.screenshot,
        framePrompt,
        {
          maxTokens: 2000,
          temperature: 0.1
        }
      );
      
      if (!analysis.success) {
        throw new Error(`AI analysis failed: ${analysis.error}`);
      }
      
      const result = {
        frame: frame.filename || `frame_${frameNumber}`,
        timestamp: frame.timestamp || null,
        context: frame.context || 'unknown',
        analysis: analysis.analysis,
        confidence: this.extractConfidence(analysis.analysis),
        keyFindings: this.extractKeyFindings(analysis.analysis),
        frameNumber,
        userPrompt,
        processedAt: new Date().toISOString()
      };
      
      // Cache the result
      if (config.cache?.enabled) {
        this.analysisCache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      throw new Error(`Frame analysis failed: ${error.message}`);
    }
  }

  createFramePrompt(userPrompt, frame, frameNumber) {
    const basePrompt = `
Based on this user request: "${userPrompt}"

Please analyze this frame (${frameNumber}) captured at ${frame.timestamp ? `timestamp ${frame.timestamp}s` : 'unknown time'}.

Context: ${frame.context || 'video frame'}

Provide analysis that directly addresses the user's request. Be specific and actionable.

${this.getPromptEnhancements(userPrompt)}

Important: Focus your analysis on what the user specifically asked for.
`;

    return basePrompt.trim();
  }

  getPromptEnhancements(userPrompt) {
    const prompt = userPrompt.toLowerCase();
    
    // Detect the type of analysis requested and provide specific guidance
    if (prompt.includes('summarize') || prompt.includes('summary')) {
      return `
For summarization:
- Extract the main topic or concept being presented
- Identify key points, definitions, or explanations
- Note any examples or demonstrations shown
- Highlight important visual elements (diagrams, code, text)
`;
    }
    
    if (prompt.includes('extract') || prompt.includes('list') || prompt.includes('find')) {
      return `
For extraction:
- Identify and list all relevant items visible in the frame
- Include exact text, code snippets, or data if visible
- Note locations and context of found items
- Be comprehensive in your extraction
`;
    }
    
    if (prompt.includes('evaluate') || prompt.includes('assess') || prompt.includes('quality')) {
      return `
For evaluation:
- Assess the quality and clarity of presentation
- Identify strengths and weaknesses
- Note any errors or areas for improvement
- Provide constructive feedback
- Rate aspects on appropriate scales
`;
    }
    
    if (prompt.includes('code') || prompt.includes('programming') || prompt.includes('script')) {
      return `
For code analysis:
- Identify programming languages used
- Extract code snippets with proper formatting
- Note syntax, patterns, and best practices
- Identify any errors or issues in the code
- Explain what the code does
`;
    }
    
    if (prompt.includes('teaching') || prompt.includes('educational') || prompt.includes('learning')) {
      return `
For educational analysis:
- Evaluate teaching methodology and clarity
- Assess how well concepts are explained
- Note use of examples, visuals, and demonstrations
- Identify learning objectives being addressed
- Suggest improvements for better learning outcomes
`;
    }
    
    // Default enhancement for open-ended prompts
    return `
General analysis guidelines:
- Be thorough and specific in your observations
- Include relevant details that address the user's request
- Provide context and explanations where helpful
- Note any issues, problems, or areas of interest
`;
  }

  async synthesizeResults(userPrompt, frameAnalyses) {
    try {
      // Prepare synthesis data
      const validAnalyses = frameAnalyses.filter(a => !a.error && a.analysis);
      
      if (validAnalyses.length === 0) {
        throw new Error('No valid frame analyses to synthesize');
      }
      
      // Create synthesis prompt based on user's original request
      const synthesisPrompt = this.createSynthesisPrompt(userPrompt, validAnalyses);
      
      // Perform synthesis using AI
      const synthesis = await this.client.analyzeImage(
        null, // No image needed for synthesis
        synthesisPrompt,
        {
          maxTokens: 3000,
          temperature: 0.2
        }
      );
      
      if (!synthesis.success) {
        throw new Error(`Synthesis failed: ${synthesis.error}`);
      }
      
      return {
        synthesisType: this.detectSynthesisType(userPrompt),
        comprehensiveResponse: synthesis.analysis,
        framesSynthesized: validAnalyses.length,
        keyThemes: this.extractKeyThemes(synthesis.analysis),
        actionableInsights: this.extractActionableInsights(synthesis.analysis),
        summary: this.createExecutiveSummary(synthesis.analysis),
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Result synthesis failed: ${error.message}`);
    }
  }

  createSynthesisPrompt(userPrompt, frameAnalyses) {
    const analysisTexts = frameAnalyses.map((analysis, index) => 
      `Frame ${analysis.frameNumber} (${analysis.context}): ${analysis.analysis}`
    ).join('\n\n');
    
    return `
Original user request: "${userPrompt}"

I have analyzed ${frameAnalyses.length} frames from a video and gathered the following insights:

${analysisTexts}

Now please create a comprehensive response to the user's original request: "${userPrompt}"

Requirements:
1. Synthesize all frame analyses into a cohesive response
2. Address the user's specific request directly
3. Organize information logically and clearly
4. Include specific examples and details from the frames
5. Provide actionable insights where appropriate
6. Format the response appropriately for the request type

Create a well-structured, comprehensive response that fully addresses what the user asked for.
`;
  }

  detectSynthesisType(userPrompt) {
    const prompt = userPrompt.toLowerCase();
    
    if (prompt.includes('summarize') || prompt.includes('summary')) return 'summary';
    if (prompt.includes('extract') || prompt.includes('list')) return 'extraction';
    if (prompt.includes('evaluate') || prompt.includes('assess')) return 'evaluation';
    if (prompt.includes('timeline') || prompt.includes('timestamp')) return 'timeline';
    if (prompt.includes('report')) return 'report';
    if (prompt.includes('notes') || prompt.includes('study')) return 'study_notes';
    
    return 'comprehensive';
  }

  extractKeyFindings(analysisText) {
    try {
      // Extract bullet points, numbered lists, or key statements
      const findings = [];
      const lines = analysisText.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+\.\s+/) || trimmed.includes('Key:') || trimmed.includes('Important:')) {
          findings.push(trimmed.replace(/^[-•*\d.]\s*/, ''));
        }
      }
      
      return findings.slice(0, 5); // Limit to top 5 findings
    } catch (error) {
      return [];
    }
  }

  extractConfidence(analysisText) {
    try {
      // Look for confidence indicators in the analysis
      const confidenceMatches = analysisText.match(/confidence[:\s]*(\d+)%|(\d+)%\s*confident/i);
      if (confidenceMatches) {
        return parseInt(confidenceMatches[1] || confidenceMatches[2]);
      }
      
      // Default confidence based on analysis quality
      if (analysisText.length > 200 && !analysisText.includes('unclear') && !analysisText.includes('difficult')) {
        return 85; // High confidence
      } else if (analysisText.length > 100) {
        return 70; // Medium confidence
      }
      return 60; // Low confidence
    } catch (error) {
      return 60;
    }
  }

  extractKeyThemes(synthesisText) {
    try {
      // Extract recurring themes or topics
      const themes = [];
      const sections = synthesisText.split(/\n\s*\n/);
      
      for (const section of sections) {
        if (section.includes('Theme:') || section.includes('Topic:') || section.includes('Key area:')) {
          const theme = section.split(':')[1]?.trim();
          if (theme) themes.push(theme);
        }
      }
      
      return themes.slice(0, 3);
    } catch (error) {
      return [];
    }
  }

  extractActionableInsights(synthesisText) {
    try {
      // Extract actionable recommendations or insights
      const insights = [];
      const lines = synthesisText.split('\n');
      
      for (const line of lines) {
        if (line.includes('recommend') || line.includes('suggest') || line.includes('should') || line.includes('could improve')) {
          insights.push(line.trim());
        }
      }
      
      return insights.slice(0, 3);
    } catch (error) {
      return [];
    }
  }

  createExecutiveSummary(synthesisText) {
    try {
      // Create a brief executive summary
      const sentences = synthesisText.split(/[.!?]+/);
      const importantSentences = sentences.filter(s => 
        s.length > 20 && 
        (s.includes('overall') || s.includes('main') || s.includes('key') || s.includes('important'))
      ).slice(0, 2);
      
      return importantSentences.join('. ').trim() + '.';
    } catch (error) {
      return 'Analysis completed successfully.';
    }
  }

  hashPrompt(prompt) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  clearCache() {
    this.analysisCache.clear();
    console.log('🧹 Analysis cache cleared');
  }

  getCacheStats() {
    return {
      size: this.analysisCache.size,
      maxSize: 100 // Could be configurable
    };
  }
}

export default DynamicAnalyzer;