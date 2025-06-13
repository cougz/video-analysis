import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testOVHConnection() {
  const baseURL = process.env.OVH_AI_ENDPOINTS_URL;
  const apiToken = process.env.OVH_AI_TOKEN;
  
  console.log('Testing OVH AI Connection...');
  console.log('Base URL:', baseURL);
  console.log('Token length:', apiToken?.length || 0);
  console.log('Token prefix:', apiToken?.substring(0, 20) + '...');
  
  try {
    const response = await axios.post(`${baseURL}/v1/chat/completions`, {
      model: 'Qwen2.5-VL-72B-Instruct',
      messages: [
        {
          role: 'user',
          content: 'Hello, this is a connection test.'
        }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Connection successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Connection failed!');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Data:', error.response?.data);
    console.log('Full URL:', `${baseURL}/v1/chat/completions`);
  }
}

testOVHConnection();