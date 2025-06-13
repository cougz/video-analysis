import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class OVHCloudClient {
  constructor() {
    this.baseURL = 'https://oai.endpoints.kepler.ai.cloud.ovh.net';
    this.apiToken = process.env.OVH_AI_TOKEN;
    this.timeout = 60000; // Default timeout
    
    if (!this.apiToken) {
      throw new Error('OVH_AI_TOKEN is required. Please check your .env file.');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async testConnection() {
    try {
      const response = await this.client.post('/v1/chat/completions', {
        model: 'Qwen2.5-VL-72B-Instruct',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test.'
          }
        ],
        max_tokens: 10
      });
      
      return {
        success: true,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async analyzeImage(imageData, prompt, options = {}) {
    try {
      const payload = {
        model: 'Qwen2.5-VL-72B-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageData}`
                }
              }
            ]
          }
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.1
      };

      const response = await this.client.post('/v1/chat/completions', payload);
      
      return {
        success: true,
        analysis: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('OVHcloud API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async analyzeBatch(imageDataArray, prompts, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 3;
    
    for (let i = 0; i < imageDataArray.length; i += batchSize) {
      const batch = imageDataArray.slice(i, i + batchSize);
      const batchPrompts = prompts.slice(i, i + batchSize);
      
      const batchPromises = batch.map((imageData, index) => 
        this.analyzeImage(imageData, batchPrompts[index], options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting
      if (i + batchSize < imageDataArray.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const ovhClient = new OVHCloudClient();