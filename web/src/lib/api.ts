import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Axios dùng chung.
 * - Access token giữ trong bộ nhớ (không lưu localStorage để tránh bị XSS đánh cắp).
 * - Refresh token nằm trong cookie httpOnly do API đặt.
 * - Gặp 401 -> tự gọi /auth/refresh 1 lần rồi gửi lại request.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;
export const setOnSessionExpired = (fn: () => void) => {
  onSessionExpired = fn;
};

export async function refreshAccessToken(): Promise<string | null> {
  refreshing ??= api
    .post<{ accessToken: string }>('/auth/refresh', undefined, { _skipRefresh: true } as never)
    .then((r) => {
      setAccessToken(r.data.accessToken);
      return r.data.accessToken;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean; _skipRefresh?: boolean };

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg = error.config as RetryConfig | undefined;
  const url = cfg?.url ?? '';
  const isAuthCall = /\/auth\/(login|register|refresh|logout)/.test(url);
  if (error.response?.status === 401 && cfg && !cfg._retried && !cfg._skipRefresh && !isAuthCall) {
    cfg._retried = true;
    const token = await refreshAccessToken();
    if (token) return api(cfg);
    onSessionExpired?.();
  }
  return Promise.reject(error);
});

/** Lấy thông báo lỗi tiếng Việt từ response của API */
export function errorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại'): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(msg)) return msg.join('. ');
    if (typeof msg === 'string') return msg;
    if (!err.response) return 'Không kết nối được máy chủ';
  }
  return fallback;
}
