import axios from 'axios';
import { LoginForm, RegisterForm, User, ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
                          const refreshToken = localStorage.getItem('refreshToken');
         if (refreshToken) {
           const response = await refreshToken_(refreshToken);
           const { token: newToken } = response.data || {};
           
           if (newToken) {
             localStorage.setItem('token', newToken);
             originalRequest.headers.Authorization = `Bearer ${newToken}`;
             
             return api(originalRequest);
           }
         }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const login = async (credentials: LoginForm): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

export const autoLogin = async (): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> => {
  const response = await api.post('/api/auth/auto-login');
  return response.data;
};

export const register = async (userData: RegisterForm): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

export const logout = async (refreshToken: string): Promise<ApiResponse<void>> => {
  const response = await api.post('/api/auth/logout', { refreshToken });
  return response.data;
};

export const refreshToken_ = async (refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken: string }>> => {
  const response = await api.post('/api/auth/refresh', { refreshToken });
  return response.data;
};

export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const updateProfile = async (userData: Partial<User>): Promise<ApiResponse<User>> => {
  const response = await api.put('/api/auth/profile', userData);
  return response.data;
};

export const changePassword = async (passwords: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<void>> => {
  const response = await api.put('/api/auth/change-password', passwords);
  return response.data;
};

export const forgotPassword = async (email: string): Promise<ApiResponse<void>> => {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string): Promise<ApiResponse<void>> => {
  const response = await api.post('/api/auth/reset-password', { token, password });
  return response.data;
};

export const verifyEmail = async (token: string): Promise<ApiResponse<void>> => {
  const response = await api.post('/api/auth/verify-email', { token });
  return response.data;
};

export const resendVerification = async (): Promise<ApiResponse<void>> => {
  const response = await api.post('/api/auth/resend-verification');
  return response.data;
};

// Export the axios instance for other services
export { api };
export default api; 