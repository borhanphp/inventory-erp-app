import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitUnauthorized } from './authEvents';

// Use your computer's IP address instead of localhost for physical device testing
// Or use 10.0.2.2 if testing on an Android Emulator
const API_URL = 'https://api.zeeventory.com/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from storage', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      console.error(`[AXIOS ERROR] ${originalRequest.method.toUpperCase()} ${originalRequest.url}:`, error.response.status, JSON.stringify(error.response.data, null, 2));
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const url = originalRequest?.url || '';
      const isAuthEndpoint = url.includes('/auth/login')
        || url.includes('/auth/register')
        || url.includes('/auth/forgot')
        || url.includes('/auth/reset')
        || url.includes('/auth/verify');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Clear auth data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      emitUnauthorized();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
