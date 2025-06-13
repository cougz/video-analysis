#!/usr/bin/env node

/**
 * Basic Usage Example - Video Learning Platform Analyzer
 * 
 * This example demonstrates basic usage of the analyzer to evaluate
 * a single course on a learning platform.
 */

import VideoLearningAnalyzer from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function basicAnalysisExample() {
  console.log('🎓 Basic Course Analysis Example\n');

  const analyzer = new VideoLearningAnalyzer();

  try {
    // Step 1: Initialize the analyzer
    console.log('1️⃣ Initializing analyzer...');
    const initResult = await analyzer.initialize();
    
    if (!initResult.success) {
      throw new Error(`Initialization failed: ${initResult.error}`);
    }

    // Step 2: Define course to analyze
    const platformUrl = 'https://udemy.com';
    const courseName = 'The Complete JavaScript Course 2024';
    
    console.log(`2️⃣ Analyzing course: "${courseName}"`);
    console.log(`   Platform: ${platformUrl}\n`);

    // Step 3: Analyze the course
    const result = await analyzer.analyzeCourse(platformUrl, courseName, {
      captureCode: true,
      captureAssessments: true,
      optimizeImages: true
    });

    // Step 4: Handle results
    if (result.success) {
      console.log('\n✅ Analysis completed successfully!');
      console.log('\n📊 Results Summary:');
      console.log(`   Course: ${result.courseName}`);
      console.log(`   Platform: ${result.platform}`);
      console.log(`   Screenshots analyzed: ${result.statistics.capturesAnalyzed}`);
      console.log(`   Analysis time: ${result.statistics.totalTime}s`);
      console.log(`   Reports generated: ${result.statistics.reportsGenerated}`);
      
      console.log('\n📁 Generated Reports:');
      result.reports.forEach(report => {
        console.log(`   ${report.format.toUpperCase()}: ${report.path} (${report.size}KB)`);
      });

      // Display course structure if available
      if (result.courseStructure) {
        console.log('\n📚 Course Structure:');
        console.log(`   Title: ${result.courseStructure.title}`);
        console.log(`   Modules: ${result.courseStructure.modules.length}`);
        console.log(`   Total Lessons: ${result.courseStructure.totalLessons}`);
      }

    } else {
      console.error('\n❌ Analysis failed:');
      console.error(`   Error: ${result.error}`);
      console.error(`   Course: ${result.courseName}`);
      
      return false;
    }

  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    return false;
  } finally {
    // Step 5: Always cleanup
    console.log('\n🧹 Cleaning up...');
    await analyzer.close();
  }

  return true;
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting basic analysis example...\n');
  
  basicAnalysisExample()
    .then(success => {
      if (success) {
        console.log('\n🎉 Example completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💔 Example failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unhandled error:', error);
      process.exit(1);
    });
}

export default basicAnalysisExample;