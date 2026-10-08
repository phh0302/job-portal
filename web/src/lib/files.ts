import { api } from './api';

/** Xin link có chữ ký từ API rồi mở / tải file (link hết hạn sau 5 phút) */
export async function getSignedUrl(endpoint: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(endpoint);
  // API trả "/api/files/..." -> ghép với baseURL khi API ở domain khác
  const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '');
  return base + data.url;
}

export async function openSignedFile(endpoint: string, mode: 'view' | 'download') {
  // Mở tab trước (tránh bị chặn popup), gán URL sau khi có link
  const win = mode === 'view' ? window.open('about:blank', '_blank') : null;
  try {
    const url = await getSignedUrl(endpoint);
    if (mode === 'view' && win) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = `${url}?download=1`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (e) {
    win?.close();
    throw e;
  }
}
