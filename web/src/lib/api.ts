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

/** API trả 403 kèm code này khi tài khoản bị admin khoá */
export const ACCOUNT_LOCKED = 'ACCOUNT_LOCKED';
let onAccountLocked: ((message: string) => void) | null = null;
export const setOnAccountLocked = (fn: (message: string) => void) => {
  onAccountLocked = fn;
};

/** Lỗi do tài khoản bị khoá? Trả về câu thông báo, ngược lại null */
export function accountLockedMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 403) return null;
  const data = err.response.data as { code?: unknown; message?: unknown } | undefined;
  if (data?.code !== ACCOUNT_LOCKED) return null;
  return typeof data.message === 'string' ? data.message : 'Tài khoản của bạn đã bị khóa';
}

export async function refreshAccessToken(): Promise<string | null> {
  refreshing ??= api
    .post<{ accessToken: string }>('/auth/refresh', undefined, { _skipRefresh: true } as never)
    .then((r) => {
      setAccessToken(r.data.accessToken);
      return r.data.accessToken;
    })
    .catch((err: unknown) => {
      setAccessToken(null);
      const locked = accountLockedMessage(err);
      if (locked) onAccountLocked?.(locked);
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
  // Bị admin khoá trong lúc đang dùng: xoá phiên ở web và báo cho người dùng (không coi như danh sách rỗng)
  const locked = isAuthCall ? null : accountLockedMessage(error);
  if (locked) {
    setAccessToken(null);
    onAccountLocked?.(locked);
  }
  return Promise.reject(error);
});

/** Lỗi phía web có câu thông báo dành cho người dùng (errorMessage() hiện nguyên câu này) */
export class UserError extends Error {}

/** Lấy thông báo lỗi tiếng Việt từ response của API */
export function errorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại'): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(msg)) return msg.join('. ');
    if (typeof msg === 'string') return msg;
    if (!err.response) return 'Không kết nối được máy chủ';
  } else if (err instanceof UserError) {
    // Lỗi do chính web ném ra kèm câu tiếng Việt dành cho người dùng (vd. hồ sơ trống khi ứng tuyển 1 chạm)
    return err.message;
  }
  return fallback;
}
