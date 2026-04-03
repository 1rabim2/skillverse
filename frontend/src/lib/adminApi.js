import axios from 'axios';
import { ADMIN_API_BASE, getCSRFToken } from './apiBase';

const adminApi = axios.create({
  baseURL: ADMIN_API_BASE,
  withCredentials: true // Enable sending/receiving cookies
});

// Request interceptor to add CSRF token
adminApi.interceptors.request.use(async (config) => {
  // For state-changing requests, add CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
    const csrfToken = await getCSRFToken();
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }
  
  // No need to set Authorization header - cookies will be sent automatically
  return config;
});

// Response interceptor for error handling
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 (Unauthorized) - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('adminLoggedIn');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;

