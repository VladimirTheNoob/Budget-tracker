import axios from 'axios';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 400) {
      return Promise.resolve(error.response);
    }
    return Promise.reject(error);
  }
);

export default client; 