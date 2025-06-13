import { jest } from '@jest/globals';
import axios from 'axios';
import { OVHCloudClient } from '../src/config/ovhcloud.js';

// Mock axios
jest.mock('axios');

describe('OVHCloudClient', () => {
  let client;
  let mockAxiosInstance;

  beforeEach(() => {
    // Mock environment variables
    process.env.OVH_AI_ENDPOINTS_URL = 'https://test-endpoint.ovh.net';
    process.env.OVH_AI_TOKEN = 'test-token';
    process.env.ANALYSIS_TIMEOUT = '30000';

    // Mock axios instance
    mockAxiosInstance = {
      post: jest.fn()
    };

    axios.create.mockReturnValue(mockAxiosInstance);

    client = new OVHCloudClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OVH_AI_ENDPOINTS_URL;
    delete process.env.OVH_AI_TOKEN;
    delete process.env.ANALYSIS_TIMEOUT;
  });

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(client.baseURL).toBe('https://test-endpoint.ovh.net');
      expect(client.apiToken).toBe('test-token');
      expect(client.timeout).toBe(30000);
    });

    test('should throw error with missing configuration', () => {
      delete process.env.OVH_AI_ENDPOINTS_URL;
      expect(() => new OVHCloudClient()).toThrow('OVHcloud AI configuration missing');
    });

    test('should create axios instance with correct config', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://test-endpoint.ovh.net',
        timeout: 30000,
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Hello' } }],
          usage: { total_tokens: 5 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.response).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/chat/completions', {
        model: 'Qwen2.5-VL-72B-Instruct',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test.'
          }
        ],
        max_tokens: 10
      });
    });

    test('should handle connection failure', async () => {
      const mockError = new Error('Network error');
      mockError.response = { status: 401 };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.status).toBe(401);
    });
  });

  describe('Image Analysis', () => {
    test('should analyze image successfully', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'This image shows a code example with good formatting and clear syntax.'
              }
            }
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 20,
            total_tokens: 70
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const imageData = 'base64-encoded-image-data';
      const prompt = 'Analyze this code example for clarity and correctness.';
      const options = { maxTokens: 1000, temperature: 0.2 };

      const result = await client.analyzeImage(imageData, prompt, options);

      expect(result.success).toBe(true);
      expect(result.analysis).toBe('This image shows a code example with good formatting and clear syntax.');
      expect(result.usage).toEqual(mockResponse.data.usage);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/chat/completions', {
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
        max_tokens: 1000,
        temperature: 0.2
      });
    });

    test('should handle analysis error', async () => {
      const mockError = new Error('API rate limit exceeded');
      mockError.response = {
        status: 429,
        data: { error: 'Rate limit exceeded' }
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await client.analyzeImage('image-data', 'test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.status).toBe(429);
    });

    test('should use default options when not provided', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Analysis result' } }],
          usage: { total_tokens: 30 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await client.analyzeImage('image-data', 'test prompt');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/chat/completions', 
        expect.objectContaining({
          max_tokens: 2000,
          temperature: 0.1
        })
      );
    });
  });

  describe('Batch Analysis', () => {
    test('should process batch analysis successfully', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Batch analysis result' } }],
          usage: { total_tokens: 25 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const imageDataArray = ['image1', 'image2', 'image3'];
      const prompts = ['prompt1', 'prompt2', 'prompt3'];
      const options = { batchSize: 2 };

      const results = await client.analyzeBatch(imageDataArray, prompts, options);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    test('should handle rate limiting with delays', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Result' } }],
          usage: { total_tokens: 20 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Mock setTimeout to track delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        callback();
        return 1;
      });

      const imageDataArray = ['image1', 'image2', 'image3', 'image4'];
      const prompts = ['prompt1', 'prompt2', 'prompt3', 'prompt4'];
      const options = { batchSize: 2 };

      await client.analyzeBatch(imageDataArray, prompts, options);

      // Should have one delay between batches
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      global.setTimeout = originalSetTimeout;
    });

    test('should handle mixed success/failure in batch', async () => {
      let callCount = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Failed analysis'));
        }
        return Promise.resolve({
          data: {
            choices: [{ message: { content: 'Success' } }],
            usage: { total_tokens: 20 }
          }
        });
      });

      const imageDataArray = ['image1', 'image2', 'image3'];
      const prompts = ['prompt1', 'prompt2', 'prompt3'];

      const results = await client.analyzeBatch(imageDataArray, prompts);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockAxiosInstance.post.mockRejectedValue(networkError);

      const result = await client.analyzeImage('image-data', 'prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      const result = await client.analyzeImage('image-data', 'prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout of 30000ms exceeded');
    });

    test('should handle API errors with response data', async () => {
      const apiError = new Error('Bad Request');
      apiError.response = {
        status: 400,
        data: {
          error: {
            message: 'Invalid image format',
            type: 'invalid_request_error'
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValue(apiError);

      const result = await client.analyzeImage('image-data', 'prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bad Request');
      expect(result.status).toBe(400);
    });
  });
});