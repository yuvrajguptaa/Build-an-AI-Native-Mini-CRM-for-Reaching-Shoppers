import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('xeno_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    return Promise.reject(err);
  }
);

// ─── API helpers ─────────────────────────────────────────────────────────────

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data).then((r) => r.data),
  me: () => api.get('/api/auth/me').then((r) => r.data),
};

// Customers
export const customerApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/customers', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/api/customers/${id}`).then((r) => r.data),
  create: (data: { name: string; email: string; phone?: string; city?: string; gender?: string; age?: string }) => 
    api.post('/api/customers', data).then((r) => r.data),
  cities: () => api.get('/api/customers/meta/cities').then((r) => r.data),
  importOrders: (rows: unknown[]) =>
    api.post('/api/customers/orders/import', rows).then((r) => r.data),
};

// Segments
export const segmentApi = {
  aiBuild: (prompt: string) =>
    api.post('/api/segments/ai-build', { prompt }).then((r) => r.data),
  list: () => api.get('/api/segments').then((r) => r.data),
  create: (data: unknown) => api.post('/api/segments', data).then((r) => r.data),
  get: (id: string) => api.get(`/api/segments/${id}`).then((r) => r.data),
};

// Campaigns
export const campaignApi = {
  list: () => api.get('/api/campaigns').then((r) => r.data),
  create: (data: unknown) => api.post('/api/campaigns', data).then((r) => r.data),
  get: (id: string) => api.get(`/api/campaigns/${id}`).then((r) => r.data),
  send: (id: string) => api.post(`/api/campaigns/${id}/send`).then((r) => r.data),
  dashboard: () => api.get('/api/campaigns/analytics/dashboard').then((r) => r.data),
};

// AI
export const aiApi = {
  generateCampaign: (objective: string, audienceHint?: string) =>
    api.post('/api/ai/generate-campaign', { objective, audienceHint }).then((r) => r.data),
  chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    api.post('/api/ai/chat', { messages }).then((r) => r.data),
};
