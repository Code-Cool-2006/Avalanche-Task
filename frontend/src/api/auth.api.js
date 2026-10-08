import { apiClient } from './client';

export const login = (credentials) => apiClient('/auth/login', { body: credentials });
export const signup = (userData) => apiClient('/auth/signup', { body: userData });
export const getMe = () => apiClient('/auth/me');
