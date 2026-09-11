import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// For Android emulator 10.0.2.2 points to host localhost; for physical devices, provide LAN IP
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage helper compatible with web/native
export const storage = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (err) {
      console.warn('Storage set error:', err);
    }
  },
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('Storage get error:', err);
      return null;
    }
  },
  async removeItem(key) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (err) {
      console.warn('Storage delete error:', err);
    }
  },
};

// Request interceptor to attach JWT token
client.interceptors.request.use(async (config) => {
  const token = await storage.getItem('partner_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
