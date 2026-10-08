import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../auth/useAuth';
import { Alert, AuthCard } from '../../components/ui';

export default function VerifyEmailPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const { user, reloadUser } = useAuth();
  const [state, setState] = useState<{ type: 'info' | 'success' | 'error'; text: string }>({
    type: 'info',
    text: 'Đang xác minh…',
  });
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return; // tránh gọi 2 lần trong StrictMode (token chỉ dùng được 1 lần)
    called.current = true;
    if (!token) {
      setState({ type: 'error', text: 'Link xác minh không hợp lệ' });
      return;
    }
    api
      .post<{ message: string }>('/auth/verify-email', { token })
      .then(({ data }) => {
        setState({ type: 'success', text: data.message });
        if (user) reloadUser().catch(() => undefined);
      })
      .catch((err) => setState({ type: 'error', text: errorMessage(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthCard title="Xác minh email">
      <div className="space-y-4">
        <Alert type={state.type}>{state.text}</Alert>
        <Link to={user ? '/' : '/login'} className="block text-center text-brand-600 hover:underline">
          {user ? 'Về trang chủ' : 'Đăng nhập'}
        </Link>
      </div>
    </AuthCard>
  );
}
