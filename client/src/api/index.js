import axios from 'axios';

// Create an Axios instance with enhanced configuration
const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,  // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for logging and potential token injection
api.interceptors.request.use(
  (config) => {
    console.log('Axios Request Interceptor:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log('Axios Response Interceptor:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('Comprehensive Axios Response Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      config: error.config
    });

    // Enhanced error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Server Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No Response Received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api; 