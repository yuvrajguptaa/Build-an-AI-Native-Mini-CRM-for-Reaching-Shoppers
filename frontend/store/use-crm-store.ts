import { create } from 'zustand';
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CRMStore {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

const mockUser: User = {
  id: 'mock-admin-id',
  name: 'XenoPilot Admin',
  email: 'admin@xenopilot.com',
  role: 'admin',
};

const mockToken = 'mock-jwt-token-value';

export const useCRMStore = create<CRMStore>()((set, get) => ({
  token: mockToken,
  user: mockUser,
  setAuth: (token, user) => {},
  clearAuth: () => {},
  isAuthenticated: () => true,
}));
