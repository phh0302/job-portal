import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshAccessToken, setAccessToken, setOnSessionExpired } from '../lib/api';
import type { AuthResponse, User, UserRole } from './types';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role: Exclude<UserRole, 'ADMIN'>;
}

export interface AuthContextValue {
  user: User | null;
  /** true trong lúc khôi phục phiên khi mới mở trang */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((data: AuthResponse) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  // Khôi phục phiên từ cookie refresh token khi tải trang
  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          setUser((await api.get<User>('/auth/me')).data);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) =>
      applyAuth((await api.post<AuthResponse>('/auth/login', { email, password })).data),
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => applyAuth((await api.post<AuthResponse>('/auth/register', input)).data),
    [applyAuth],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const reloadUser = useCallback(async () => {
    setUser((await api.get<User>('/auth/me')).data);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, reloadUser }),
    [user, loading, login, register, logout, reloadUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
