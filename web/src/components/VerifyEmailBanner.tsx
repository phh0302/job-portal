import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../auth/useAuth';

/** Nhắc xác minh email cho tài khoản chưa xác minh */
export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  if (!user || user.emailVerified) return null;

  async function resend() {
    setSending(true);
    try {
      const { data } = await api.post<{ message: string }>('/auth/resend-verification');
      setMsg(data.message);
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <span>Email {user.email} chưa được xác minh. Kiểm tra hộp thư để kích hoạt.</span>
        {msg ? (
          <span className="font-medium">{msg}</span>
        ) : (
          <button onClick={resend} disabled={sending} className="font-medium underline disabled:opacity-60">
            {sending ? 'Đang gửi…' : 'Gửi lại email'}
          </button>
        )}
      </div>
    </div>
  );
}
