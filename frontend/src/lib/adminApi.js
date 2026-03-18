import axios from 'axios';
import { ADMIN_API_BASE } from './apiBase';

const adminApi = axios.create({
  baseURL: ADMIN_API_BASE
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default adminApi;
