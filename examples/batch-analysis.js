#!/usr/bin/env node

/**
 * Batch Analysis Example - Video Learning Platform Analyzer
 * 
 * This example demonstrates how to analyze multiple courses
 * in batch and generate comparative reports.
 */

import VideoLearningAnalyzer from '../src/index.js';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function batchAnalysisExample() {
  console.log('🎓 Batch Course Analysis Example\n');

  const analyzer = new VideoLearningAnalyzer();
  const results = [];
  const startTime = Date.now();

  try {
    // Step 1: Initialize the analyzer
    console.log('1️⃣ Initializing analyzer...');
    const initResult = await analyzer.initialize();
    
    if (!initResult.success) {
      throw new Error(`Initialization failed: ${initResult.error}`);
    }

    // Step 2: Define courses to analyze
    const coursesToAnalyze = [
      {
        platform: 'https://udemy.com',
        name: 'JavaScript Fundamentals',
        options: { captureCode: true, captureAssessments: false }
      },
      {
        platform: 'https://udemy.com',
        name: 'React - The Complete Guide',
        options: { captureCode: true, captureAssessments: true }
      },
      {
        platform: 'https://coursera.org',
        name: 'Machine Learning Course',
        options: { captureCode: false, captureAssessments: true }
      },
      {
        platform: 'https://edx.org',
        name: 'Introduction to Computer Science',
        options: { captureCode: true, captureAssessments: true }
      }
    ];

    console.log(`2️⃣ Analyzing ${coursesToAnalyze.length} courses...\n`);

    // Step 3: Analyze each course
    for (let i = 0; i < coursesToAnalyze.length; i++) {
      const course = coursesToAnalyze[i];
      const courseNum = i + 1;
      
      console.log(`📚 [${courseNum}/${coursesToAnalyze.length}] Analyzing: "${course.name}"`);
      console.log(`   Platform: ${course.platform}`);

      try {
        const result = await analyzer.analyzeCourse(
          course.platform,
          course.name,
          course.options
        );

        results.push({
          ...result,
          courseIndex: courseNum,
          platform: course.platform,
          options: course.options
        });

        if (result.success) {
          console.log(`   ✅ Completed in ${result.statistics.totalTime}s`);
          console.log(`   📊 ${result.statistics.capturesAnalyzed} screenshots analyzed`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }

      } catch (error) {
        console.log(`   💥 Error: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          courseName: course.name,
          platform: course.platform,
          courseIndex: courseNum
        });
      }

      console.log(''); // Add spacing between courses

      // Add delay between courses to avoid overwhelming the platforms
      if (i < coursesToAnalyze.length - 1) {
        console.log('   ⏱️  Waiting 30 seconds before next course...\n');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // Step 4: Generate batch summary report
    console.log('📊 Generating batch summary report...');
    const batchSummary = generateBatchSummary(results);
    await saveBatchSummary(batchSummary);

    // Step 5: Display results
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('\n🎉 Batch analysis completed!');
    console.log(`⏱️  Total time: ${Math.round(totalTime / 60)} minutes`);
    console.log('\n📊 Batch Summary:');
    console.log(`   Total courses: ${batchSummary.totalCourses}`);
    console.log(`   Successful analyses: ${batchSummary.successfulAnalyses}`);
    console.log(`   Failed analyses: ${batchSummary.failedAnalyses}`);
    console.log(`   Success rate: ${batchSummary.successRate}%`);
    console.log(`   Average analysis time: ${batchSummary.averageAnalysisTime}s`);
    console.log(`   Total screenshots: ${batchSummary.totalScreenshots}`);
    console.log(`   Total reports: ${batchSummary.totalReports}`);

    console.log('\n🏆 Top Performing Courses:');
    batchSummary.topCourses.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.name} (Score: ${course.score}/10)`);
    });

    console.log('\n⚠️  Courses Needing Attention:');
    batchSummary.coursesNeedingAttention.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.name} (Issues: ${course.issueCount})`);
    });

    console.log(`\n📁 Batch summary saved to: ${batchSummary.reportPath}`);

    return true;

  } catch (error) {
    console.error('\n💥 Batch analysis failed:', error.message);
    return false;
  } finally {
    // Step 6: Cleanup
    console.log('\n🧹 Cleaning up...');
    await analyzer.close();
  }
}

function generateBatchSummary(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const summary = {
    timestamp: new Date().toISOString(),
    totalCourses: results.length,
    successfulAnalyses: successful.length,
    failedAnalyses: failed.length,
    successRate: Math.round((successful.length / results.length) * 100),
    averageAnalysisTime: successful.length > 0 ? 
      Math.round(successful.reduce((sum, r) => sum + (r.statistics?.totalTime || 0), 0) / successful.length) : 0,
    totalScreenshots: successful.reduce((sum, r) => sum + (r.statistics?.capturesAnalyzed || 0), 0),
    totalReports: successful.reduce((sum, r) => sum + (r.statistics?.reportsGenerated || 0), 0),
    results: results,
    topCourses: [],
    coursesNeedingAttention: [],
    platformBreakdown: {},
    errors: failed.map(r => ({ course: r.courseName, error: r.error }))
  };

  // Calculate platform breakdown
  results.forEach(result => {
    const platform = new URL(result.platform).hostname;
    if (!summary.platformBreakdown[platform]) {
      summary.platformBreakdown[platform] = { total: 0, successful: 0 };
    }
    summary.platformBreakdown[platform].total++;
    if (result.success) {
      summary.platformBreakdown[platform].successful++;
    }
  });

  // Identify top courses (placeholder - would need actual score extraction)
  summary.topCourses = successful
    .map(r => ({
      name: r.courseName,
      score: 8.5, // Placeholder - would extract from analysis results
      platform: new URL(r.platform).hostname
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Identify courses needing attention (placeholder)
  summary.coursesNeedingAttention = successful
    .map(r => ({
      name: r.courseName,
      issueCount: 3, // Placeholder - would extract from analysis results
      platform: new URL(r.platform).hostname
    }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 3);

  return summary;
}

async function saveBatchSummary(summary) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch_analysis_summary_${timestamp}.json`;
  const reportPath = path.join(process.cwd(), 'reports', filename);
  
  await fs.ensureDir(path.dirname(reportPath));
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
  
  summary.reportPath = reportPath;
  return reportPath;
}

// Helper function to create a simple HTML report
async function generateBatchHTMLReport(summary) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Batch Analysis Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #3498db; color: white; padding: 20px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0; color: #2c3e50; }
        .metric .value { font-size: 2em; font-weight: bold; color: #3498db; }
        .section { margin: 30px 0; }
        .course-list { list-style: none; padding: 0; }
        .course-list li { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .success { border-left: 4px solid #27ae60; }
        .error { border-left: 4px solid #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Batch Course Analysis Summary</h1>
        <p>Generated: ${new Date(summary.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <h3>Total Courses</h3>
            <div class="value">${summary.totalCourses}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value">${summary.successRate}%</div>
        </div>
        <div class="metric">
            <h3>Total Screenshots</h3>
            <div class="value">${summary.totalScreenshots}</div>
        </div>
        <div class="metric">
            <h3>Avg Analysis Time</h3>
            <div class="value">${summary.averageAnalysisTime}s</div>
        </div>
    </div>

    <div class="section">
        <h2>Course Results</h2>
        <ul class="course-list">
            ${summary.results.map(result => `
                <li class="${result.success ? 'success' : 'error'}">
                    <strong>${result.courseName}</strong> - 
                    ${new URL(result.platform).hostname} - 
                    ${result.success ? `✅ Success (${result.statistics?.totalTime || 0}s)` : `❌ Failed: ${result.error}`}
                </li>
            `).join('')}
        </ul>
    </div>
</body>
</html>
  `;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch_analysis_summary_${timestamp}.html`;
  const reportPath = path.join(process.cwd(), 'reports', filename);
  
  await fs.writeFile(reportPath, htmlContent);
  return reportPath;
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting batch analysis example...\n');
  
  batchAnalysisExample()
    .then(success => {
      if (success) {
        console.log('\n🎉 Batch analysis example completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💔 Batch analysis example failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unhandled error:', error);
      process.exit(1);
    });
}

export default batchAnalysisExample;