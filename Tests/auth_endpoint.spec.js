import axios from 'axios';
import { test, expect } from '@playwright/test';

test.describe('Authentication Endpoint', () => {
  test('should successfully connect to auth status endpoint', async () => {
    try {
      // Configure axios for this test
      const axiosInstance = axios.create({
        baseURL: 'http://localhost:5000',
        timeout: 10000,
        withCredentials: true
      });

      // Attempt to get auth status
      const response = await axiosInstance.get('/auth/status');

      // Validate response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      // Optional: Check specific properties if known
      console.log('Auth Status Response:', response.data);
    } catch (error) {
      console.error('Auth Status Error:', error);
      
      // Provide detailed error information
      if (axios.isAxiosError(error)) {
        console.error('Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data
        });
      }

      throw error;
    }
  });

  test('should handle authentication with valid credentials', async () => {
    try {
      const axiosInstance = axios.create({
        baseURL: 'http://localhost:5000',
        timeout: 10000,
        withCredentials: true
      });

      // Use test credentials (replace with actual test user)
      const loginResponse = await axiosInstance.post('/auth/login', {
        email: 'test@example.com',
        password: 'testpassword'
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.token).toBeDefined();
      console.log('Login successful:', loginResponse.data);
    } catch (error) {
      console.error('Login Error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Login Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data
        });
      }

      throw error;
    }
  });
}); 