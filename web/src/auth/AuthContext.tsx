import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from '../components/Toast';
import { api, refreshAccessToken, setAccessToken, setOnAccountLocked, setOnSessionExpired } from '../lib/api';
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
  /** Lý do phiên bị kết thúc ngoài ý muốn (vd. tài khoản bị khoá) – trang đăng nhập hiện câu này */
  sessionNotice: string | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const lockNotified = useRef(false);

  const applyAuth = useCallback((data: AuthResponse) => {
    setSessionNotice(null);
    lockNotified.current = false;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  // Khôi phục phiên từ cookie refresh token khi tải trang
  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    // Admin khoá tài khoản trong lúc đang dùng -> đăng xuất ở web, báo 1 lần (nhiều request lỗi cùng lúc)
    setOnAccountLocked((message) => {
      if (!lockNotified.current) {
        lockNotified.current = true;
        toast(message, 'error');
      }
      setUser(null);
      setSessionNotice(message);
    });
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
    () => ({ user, loading, login, register, logout, reloadUser, sessionNotice }),
    [user, loading, login, register, logout, reloadUser, sessionNotice],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
