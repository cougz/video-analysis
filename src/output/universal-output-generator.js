import fs from 'fs-extra';
import path from 'path';
import config from '../config/index.js';

export class UniversalOutputGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'reports');
    this.supportedFormats = ['text', 'json', 'markdown', 'html', 'csv'];
    this.ensureOutputDir();
  }

  async ensureOutputDir() {
    await fs.ensureDir(this.outputDir);
  }

  async generateOutput(analysisResult, userPrompt, outputPreference = 'auto') {
    console.log(`📄 Generating output for: "${userPrompt}"`);
    
    try {
      // Determine the best output format based on the prompt and preference
      const outputFormat = await this.determineFormat(userPrompt, outputPreference);
      console.log(`📋 Selected format: ${outputFormat}`);
      
      // Generate content based on format
      let generatedOutput;
      
      switch (outputFormat) {
        case 'summary':
          generatedOutput = await this.generateSummary(analysisResult, userPrompt);
          break;
        case 'timeline':
          generatedOutput = await this.generateTimeline(analysisResult, userPrompt);
          break;
        case 'extraction':
          generatedOutput = await this.generateExtraction(analysisResult, userPrompt);
          break;
        case 'report':
          generatedOutput = await this.generateReport(analysisResult, userPrompt);
          break;
        case 'study_notes':
          generatedOutput = await this.generateStudyNotes(analysisResult, userPrompt);
          break;
        case 'json':
          generatedOutput = await this.generateJSON(analysisResult, userPrompt);
          break;
        case 'csv':
          generatedOutput = await this.generateCSV(analysisResult, userPrompt);
          break;
        default:
          generatedOutput = await this.generateCustomOutput(analysisResult, userPrompt);
      }
      
      // Save output to file
      const savedFiles = await this.saveOutput(generatedOutput, outputFormat, userPrompt);
      
      return {
        success: true,
        format: outputFormat,
        content: generatedOutput.content,
        files: savedFiles,
        metadata: generatedOutput.metadata
      };
      
    } catch (error) {
      console.error('❌ Output generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        userPrompt
      };
    }
  }

  async determineFormat(userPrompt, outputPreference) {
    const prompt = userPrompt.toLowerCase();
    
    // If user specified a preference, use it if valid
    if (outputPreference !== 'auto' && this.supportedFormats.includes(outputPreference)) {
      return outputPreference;
    }
    
    // Determine format based on prompt content
    if (prompt.includes('summarize') || prompt.includes('summary')) {
      return 'summary';
    }
    
    if (prompt.includes('timeline') || prompt.includes('timestamps') || prompt.includes('progression')) {
      return 'timeline';
    }
    
    if (prompt.includes('extract') || prompt.includes('list') || prompt.includes('find all')) {
      return 'extraction';
    }
    
    if (prompt.includes('report') || prompt.includes('analysis report')) {
      return 'report';
    }
    
    if (prompt.includes('notes') || prompt.includes('study') || prompt.includes('learning')) {
      return 'study_notes';
    }
    
    if (prompt.includes('json') || prompt.includes('data') || prompt.includes('structured')) {
      return 'json';
    }
    
    if (prompt.includes('csv') || prompt.includes('spreadsheet') || prompt.includes('table')) {
      return 'csv';
    }
    
    // Default to comprehensive summary
    return 'summary';
  }

  async generateSummary(analysisResult, userPrompt) {
    const content = this.createSummaryContent(analysisResult, userPrompt);
    
    return {
      type: 'summary',
      format: 'markdown',
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        totalFrames: analysisResult.totalFrames || 0,
        analysisType: 'summary'
      }
    };
  }

  createSummaryContent(analysisResult, userPrompt) {
    const synthesis = analysisResult.synthesizedResult;
    
    return `# Video Analysis Summary

**User Request:** ${userPrompt}

**Generated:** ${new Date().toLocaleString()}

## Executive Summary

${synthesis?.summary || 'Summary not available'}

## Comprehensive Analysis

${synthesis?.comprehensiveResponse || 'Analysis not available'}

## Key Findings

${synthesis?.keyThemes?.map(theme => `- ${theme}`).join('\n') || 'No key themes identified'}

## Actionable Insights

${synthesis?.actionableInsights?.map(insight => `- ${insight}`).join('\n') || 'No actionable insights available'}

## Analysis Metadata

- **Total Frames Analyzed:** ${analysisResult.totalFrames || 'Unknown'}
- **Analysis Method:** ${synthesis?.synthesisType || 'Unknown'}
- **Processing Time:** ${analysisResult.processedAt ? new Date(analysisResult.processedAt).toLocaleString() : 'Unknown'}

---
*Generated by Universal Video Analysis Platform*
`;
  }

  async generateTimeline(analysisResult, userPrompt) {
    const timelineContent = this.createTimelineContent(analysisResult, userPrompt);
    
    return {
      type: 'timeline',
      format: 'markdown',
      content: timelineContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        totalEvents: analysisResult.frameAnalyses?.length || 0,
        analysisType: 'timeline'
      }
    };
  }

  createTimelineContent(analysisResult, userPrompt) {
    const frameAnalyses = analysisResult.frameAnalyses || [];
    
    let timelineContent = `# Video Timeline Analysis

**User Request:** ${userPrompt}

**Generated:** ${new Date().toLocaleString()}

## Timeline Events

`;

    frameAnalyses
      .filter(frame => !frame.error && frame.timestamp !== undefined)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .forEach((frame, index) => {
        const timestamp = this.formatTimestamp(frame.timestamp);
        timelineContent += `### ${timestamp} - ${frame.context || 'Video Frame'}

**Frame:** ${frame.frame || `Frame ${index + 1}`}

${frame.analysis || 'No analysis available'}

${frame.keyFindings?.length > 0 ? 
  `**Key Points:**\n${frame.keyFindings.map(finding => `- ${finding}`).join('\n')}` : 
  ''}

---

`;
      });

    timelineContent += `## Summary

${analysisResult.synthesizedResult?.comprehensiveResponse || 'No summary available'}

---
*Generated by Universal Video Analysis Platform*
`;

    return timelineContent;
  }

  async generateExtraction(analysisResult, userPrompt) {
    const extractionContent = this.createExtractionContent(analysisResult, userPrompt);
    
    return {
      type: 'extraction',
      format: 'markdown',
      content: extractionContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        totalItems: this.countExtractedItems(analysisResult),
        analysisType: 'extraction'
      }
    };
  }

  createExtractionContent(analysisResult, userPrompt) {
    const frameAnalyses = analysisResult.frameAnalyses || [];
    
    let extractionContent = `# Content Extraction

**User Request:** ${userPrompt}

**Generated:** ${new Date().toLocaleString()}

## Extracted Content

`;

    // Group extractions by type or context
    const groupedExtractions = this.groupExtractionsByType(frameAnalyses);
    
    Object.entries(groupedExtractions).forEach(([type, items]) => {
      extractionContent += `### ${this.capitalizeFirst(type)}

`;
      items.forEach((item, index) => {
        extractionContent += `${index + 1}. **${item.source}** (${this.formatTimestamp(item.timestamp)})
   ${item.content}

`;
      });
    });

    extractionContent += `## Summary of Extracted Content

${analysisResult.synthesizedResult?.comprehensiveResponse || 'No summary available'}

---
*Generated by Universal Video Analysis Platform*
`;

    return extractionContent;
  }

  async generateReport(analysisResult, userPrompt) {
    const reportContent = this.createReportContent(analysisResult, userPrompt);
    
    return {
      type: 'report',
      format: 'html',
      content: reportContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        analysisType: 'comprehensive_report'
      }
    };
  }

  createReportContent(analysisResult, userPrompt) {
    const synthesis = analysisResult.synthesizedResult;
    const frameAnalyses = analysisResult.frameAnalyses || [];
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .frame-analysis { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .timestamp { font-weight: bold; color: #0066cc; }
        .key-finding { background: #e7f3ff; padding: 10px; margin: 5px 0; border-left: 4px solid #0066cc; }
        .summary-box { background: #f0f8ff; padding: 20px; border-radius: 8px; }
        h1, h2, h3 { color: #333; }
        .metadata { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Video Analysis Report</h1>
        <p><strong>Analysis Request:</strong> ${userPrompt}</p>
        <p class="metadata">Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="summary-box">
            ${synthesis?.summary || 'Summary not available'}
        </div>
    </div>

    <div class="section">
        <h2>Detailed Analysis</h2>
        <p>${synthesis?.comprehensiveResponse || 'Detailed analysis not available'}</p>
    </div>

    <div class="section">
        <h2>Frame-by-Frame Analysis</h2>
        ${frameAnalyses.map((frame, index) => `
        <div class="frame-analysis">
            <h3><span class="timestamp">${this.formatTimestamp(frame.timestamp)}</span> - ${frame.frame || `Frame ${index + 1}`}</h3>
            <p><strong>Context:</strong> ${frame.context || 'Unknown'}</p>
            <p>${frame.analysis || 'No analysis available'}</p>
            ${frame.keyFindings?.length > 0 ? 
              frame.keyFindings.map(finding => `<div class="key-finding">${finding}</div>`).join('') : 
              ''}
        </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Key Insights</h2>
        ${synthesis?.actionableInsights?.map(insight => `<p>• ${insight}</p>`).join('') || '<p>No actionable insights available</p>'}
    </div>

    <div class="section">
        <h2>Analysis Metadata</h2>
        <ul>
            <li><strong>Total Frames:</strong> ${analysisResult.totalFrames || 'Unknown'}</li>
            <li><strong>Analysis Type:</strong> ${synthesis?.synthesisType || 'Unknown'}</li>
            <li><strong>Processing Time:</strong> ${analysisResult.processedAt ? new Date(analysisResult.processedAt).toLocaleString() : 'Unknown'}</li>
        </ul>
    </div>
</body>
</html>`;
  }

  async generateStudyNotes(analysisResult, userPrompt) {
    const notesContent = this.createStudyNotesContent(analysisResult, userPrompt);
    
    return {
      type: 'study_notes',
      format: 'markdown',
      content: notesContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        analysisType: 'study_notes'
      }
    };
  }

  createStudyNotesContent(analysisResult, userPrompt) {
    const synthesis = analysisResult.synthesizedResult;
    const frameAnalyses = analysisResult.frameAnalyses || [];
    
    return `# Study Notes

**Topic:** ${userPrompt}

**Date:** ${new Date().toLocaleDateString()}

## Key Concepts

${synthesis?.keyThemes?.map(theme => `### ${theme}

- [Add your notes here]

`).join('') || '### Main Topic\n\n- [Add your notes here]\n\n'}

## Important Points

${frameAnalyses
  .filter(frame => frame.keyFindings?.length > 0)
  .map(frame => frame.keyFindings.map(finding => `- ${finding} *(${this.formatTimestamp(frame.timestamp)})*`).join('\n'))
  .join('\n') || '- [Add important points here]'}

## Summary

${synthesis?.summary || '[Add your summary here]'}

## Questions for Review

- [What are the key takeaways?]
- [How does this connect to other topics?]
- [What needs further clarification?]

## Action Items

${synthesis?.actionableInsights?.map(insight => `- [ ] ${insight}`).join('\n') || '- [ ] [Add action items here]'}

---
*Study notes generated from video analysis*
`;
  }

  async generateJSON(analysisResult, userPrompt) {
    const jsonData = {
      analysisRequest: userPrompt,
      generatedAt: new Date().toISOString(),
      summary: analysisResult.synthesizedResult,
      frameAnalyses: analysisResult.frameAnalyses || [],
      metadata: {
        totalFrames: analysisResult.totalFrames || 0,
        analysisType: 'structured_data',
        processingTime: analysisResult.processedAt
      }
    };
    
    return {
      type: 'json',
      format: 'json',
      content: JSON.stringify(jsonData, null, 2),
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        analysisType: 'json_export'
      }
    };
  }

  async generateCSV(analysisResult, userPrompt) {
    const frameAnalyses = analysisResult.frameAnalyses || [];
    
    let csvContent = 'Timestamp,Frame,Context,Analysis,Key Findings,Confidence\n';
    
    frameAnalyses.forEach(frame => {
      const timestamp = frame.timestamp || '';
      const frameName = frame.frame || '';
      const context = frame.context || '';
      const analysis = (frame.analysis || '').replace(/"/g, '""').replace(/\n/g, ' ');
      const keyFindings = (frame.keyFindings || []).join('; ').replace(/"/g, '""');
      const confidence = frame.confidence || '';
      
      csvContent += `"${timestamp}","${frameName}","${context}","${analysis}","${keyFindings}","${confidence}"\n`;
    });
    
    return {
      type: 'csv',
      format: 'csv',
      content: csvContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        rows: frameAnalyses.length,
        analysisType: 'csv_export'
      }
    };
  }

  async generateCustomOutput(analysisResult, userPrompt) {
    // For custom requests, create a flexible format
    const customContent = `# Custom Analysis Output

**Request:** ${userPrompt}

**Generated:** ${new Date().toLocaleString()}

## Analysis Results

${analysisResult.synthesizedResult?.comprehensiveResponse || 'No analysis available'}

## Supporting Details

${analysisResult.frameAnalyses?.map((frame, index) => `
**Frame ${index + 1}** (${this.formatTimestamp(frame.timestamp)})
${frame.analysis || 'No analysis available'}
`).join('\n') || 'No frame details available'}

---
*Custom output generated by Universal Video Analysis Platform*
`;

    return {
      type: 'custom',
      format: 'markdown',
      content: customContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        userPrompt,
        analysisType: 'custom'
      }
    };
  }

  async saveOutput(generatedOutput, format, userPrompt) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedPrompt = userPrompt.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50).trim().replace(/\s+/g, '_');
    
    const extension = this.getFileExtension(generatedOutput.format);
    const filename = `analysis_${sanitizedPrompt}_${timestamp}.${extension}`;
    const filepath = path.join(this.outputDir, filename);
    
    try {
      await fs.writeFile(filepath, generatedOutput.content, 'utf8');
      
      const stats = await fs.stat(filepath);
      
      return [{
        format: generatedOutput.format,
        path: filepath,
        filename,
        size: Math.round(stats.size / 1024), // Size in KB
        type: generatedOutput.type
      }];
      
    } catch (error) {
      console.error('❌ Failed to save output:', error.message);
      throw error;
    }
  }

  getFileExtension(format) {
    const extensions = {
      'markdown': 'md',
      'html': 'html',
      'json': 'json',
      'csv': 'csv',
      'text': 'txt'
    };
    
    return extensions[format] || 'txt';
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const totalSeconds = Math.round(timestamp);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  groupExtractionsByType(frameAnalyses) {
    const grouped = {};
    
    frameAnalyses.forEach(frame => {
      if (!frame.error && frame.analysis) {
        const type = frame.context || 'general';
        if (!grouped[type]) grouped[type] = [];
        
        grouped[type].push({
          source: frame.frame || 'Unknown',
          timestamp: frame.timestamp,
          content: frame.analysis
        });
      }
    });
    
    return grouped;
  }

  countExtractedItems(analysisResult) {
    return (analysisResult.frameAnalyses || []).length;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }
}

export default UniversalOutputGenerator;