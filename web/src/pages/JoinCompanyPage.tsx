import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { toast } from '../components/Toast';
import { Alert, AuthCard, Button } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { useSeo } from '../lib/seo';

interface Preview {
  companyName: string;
  companySlug: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
  expiresAt: string;
}

/** Trang nhận lời mời tham gia công ty (link trong email) */
export default function JoinCompanyPage() {
  useSeo({ title: 'Tham gia công ty', noindex: true });
  const token = useSearchParams()[0].get('token') ?? '';
  const { user, loading, logout, reloadUser } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const here = `/join-company?token=${encodeURIComponent(token)}`;

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => (await api.get<Preview>('/team-invitations/preview', { params: { token } })).data,
    enabled: !!token,
    retry: false,
  });
  const accept = useMutation({
    mutationFn: async () => (await api.post<{ companyName: string }>('/employer/team/invitations/accept', { token })).data,
    onSuccess: async (d) => {
      qc.removeQueries({ queryKey: ['employer'] });
      await reloadUser().catch(() => undefined);
      toast(`Bạn đã tham gia ${d.companyName}`);
      navigate('/employer', { replace: true });
    },
  });

  if (!token) return <AuthCard title="Tham gia công ty"><Alert type="error">Link mời không hợp lệ.</Alert></AuthCard>;
  if (isLoading || loading) return <AuthCard title="Tham gia công ty"><p className="text-slate-500">Đang tải…</p></AuthCard>;
  if (error || !inv)
    return (
      <AuthCard title="Tham gia công ty">
        <Alert type="error">{errorMessage(error, 'Lời mời không hợp lệ')}</Alert>
      </AuthCard>
    );

  const sameEmail = user?.email.toLowerCase() === inv.email.toLowerCase();
  return (
    <AuthCard
      title={`Tham gia ${inv.companyName}`}
      subtitle={<>Bạn được mời làm <b>{inv.role === 'OWNER' ? 'quản trị viên' : 'thành viên'}</b> đội tuyển dụng. Lời mời dành cho <b>{inv.email}</b>, hết hạn {formatDate(inv.expiresAt)}.</>}
    >
      {accept.isError && <div className="mb-3"><Alert type="error">{errorMessage(accept.error)}</Alert></div>}
      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Đăng nhập hoặc tạo tài khoản nhà tuyển dụng bằng email <b>{inv.email}</b> để tham gia.</p>
          <Link to="/login" state={{ from: here }} className="block rounded-lg bg-brand-600 px-4 py-2 text-center font-medium text-white hover:bg-brand-700">
            Đăng nhập
          </Link>
          <Link
            to={`/register?role=employer&email=${encodeURIComponent(inv.email)}&next=${encodeURIComponent(here)}`}
            className="block rounded-lg border border-brand-600 px-4 py-2 text-center font-medium text-brand-600 hover:bg-brand-50"
          >
            Tạo tài khoản nhà tuyển dụng
          </Link>
        </div>
      ) : user.role !== 'EMPLOYER' || !sameEmail ? (
        <div className="space-y-3">
          <Alert type="error">
            Bạn đang đăng nhập bằng {user.email}
            {user.role !== 'EMPLOYER' ? ' (không phải tài khoản nhà tuyển dụng)' : ''}. Lời mời chỉ dùng được với tài khoản nhà tuyển dụng {inv.email}.
          </Alert>
          <Button variant="outline" className="w-full" onClick={() => logout().then(() => navigate('/login', { state: { from: here } }))}>
            Đăng xuất và đăng nhập tài khoản khác
          </Button>
        </div>
      ) : (
        <Button className="w-full" loading={accept.isPending} onClick={() => accept.mutate()}>
          Tham gia {inv.companyName}
        </Button>
      )}
    </AuthCard>
  );
}
