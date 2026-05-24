import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend IP/URL
const API_URL = 'http://192.168.100.119:5000'; // Your PC's WiFi IP

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const raw = await AsyncStorage.getItem('session');
  if (raw) {
    const session = JSON.parse(raw);
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

// Response interceptor: extract server error messages from non-2xx responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      // Attach server payload so callers can read error.response.data
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

// ---------- Auth ----------
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    return data;
  },
  register: async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/register', { email, password });
    return data;
  },
  getSession: async () => {
    const { data } = await api.get('/api/auth/session');
    return data;
  },
  logout: async () => {
    const { data } = await api.post('/api/auth/logout');
    return data;
  },
  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.post('/api/auth/change-password', { oldPassword, newPassword });
    return data;
  },
};

// ---------- Data (CRUD) ----------
export const dataApi = {
  getAll: async (table: string, params?: Record<string, string>) => {
    const { data } = await api.get(`/api/data/${table}`, { params });
    return data?.data ?? data ?? [];
  },
  getOne: async (table: string, id: string) => {
    const { data } = await api.get(`/api/data/${table}`, { params: { id } });
    const arr = data?.data ?? data ?? [];
    return arr[0] ?? null;
  },
  create: async (table: string, payload: any) => {
    const { data } = await api.post(`/api/data/${table}`, payload);
    return data;
  },
  update: async (table: string, id: string, payload: any) => {
    const { data } = await api.put(`/api/data/${table}?id=${id}`, payload);
    return data;
  },
  remove: async (table: string, id: string) => {
    const { data } = await api.delete(`/api/data/${table}?id=${id}`);
    return data;
  },
};

// ---------- Upload ----------
export const uploadApi = {
  uploadFile: async (uri: string, fileName: string, mimeType = 'application/octet-stream') => {
    const formData = new FormData();

    if (typeof window !== 'undefined' && uri.startsWith('blob:')) {
      // ── Web / React Native Web ──────────────────────────────────────────
      // expo-document-picker returns a blob: URL on web.
      // We must fetch() the blob first, then append it as a real Blob.
      const blobResponse = await fetch(uri);
      const blob = await blobResponse.blob();
      formData.append('file', blob, fileName);

      // On the web, do NOT set Content-Type manually — the browser will
      // add the correct multipart boundary automatically.
      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': undefined as any },
        timeout: 60000,
      });
      return data;
    } else {
      // ── Native (iOS / Android) ──────────────────────────────────────────
      // React Native FormData accepts the {uri, name, type} object form.
      formData.append('file', {
        uri,
        name: fileName,
        type: mimeType,
      } as any);

      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return data;
    }
  },
};

export { api, API_URL };
