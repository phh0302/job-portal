import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { Alert, AuthCard, Button, Field } from '../../components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setDone(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Quên mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.">
      {done ? (
        <div className="space-y-4">
          <Alert type="success">{done}</Alert>
          <Link to="/login" className="block text-center text-sm text-brand-600 hover:underline">
            ← Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={loading} className="w-full">
            Gửi link đặt lại
          </Button>
          <Link to="/login" className="block text-center text-sm text-brand-600 hover:underline">
            ← Quay lại đăng nhập
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
