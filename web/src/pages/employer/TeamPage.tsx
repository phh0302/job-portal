import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ListSkeleton } from '../../components/Skeleton';
import Select from '../../components/Select';
import { toast } from '../../components/Toast';
import { Alert, Button } from '../../components/ui';
import { EMPLOYER_ME_KEY } from '../../layouts/EmployerLayout';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';

type Role = 'OWNER' | 'MEMBER';
interface Team {
  myRole: Role;
  members: { userId: number; fullName: string; email: string; position: string | null; role: Role; isMe: boolean; active: boolean }[];
  invitations: { id: number; email: string; role: Role; expiresAt: string; createdAt: string; invitedBy: string | null }[];
}
const ROLE_LABEL: Record<Role, string> = { OWNER: 'Quản trị viên', MEMBER: 'Thành viên' };
const KEY = ['employer', 'team'];

function InviteForm() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [link, setLink] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: async () => (await api.post<{ link: string }>('/employer/team/invitations', { email, role })).data,
    onSuccess: (d) => {
      setLink(d.link);
      setEmail('');
      qc.invalidateQueries({ queryKey: KEY });
      toast('Đã gửi lời mời');
    },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Mời đồng nghiệp</h2>
      <p className="text-sm text-slate-500">Người được mời nhận email kèm link (hiệu lực 7 ngày) để tham gia công ty bằng tài khoản nhà tuyển dụng.</p>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); invite.mutate(); }} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); invite.reset(); }}
          placeholder="email@congty.vn"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
        />
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)} options={[{ value: 'MEMBER', label: 'Thành viên' }, { value: 'OWNER', label: 'Quản trị viên' }]} className="sm:w-40" />
        <Button type="submit" loading={invite.isPending}>Gửi lời mời</Button>
      </form>
      {invite.isError && <div className="mt-2"><Alert type="error">{errorMessage(invite.error)}</Alert></div>}
      {link && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-slate-600">Nếu email chưa tới, bạn có thể gửi trực tiếp link này (chỉ dùng được 1 lần):</p>
          <div className="mt-1 flex gap-2">
            <input readOnly value={link} className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
            <button type="button" onClick={() => navigator.clipboard.writeText(link).then(() => toast('Đã sao chép link'))} className="text-brand-600 hover:underline">
              Sao chép
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function TeamPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<Team>('/employer/team')).data });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) => api.patch(`/employer/team/members/${userId}`, { role }),
    onSuccess: refresh,
    meta: { successMessage: 'Đã đổi vai trò' },
  });
  const remove = useMutation({
    mutationFn: (userId: number) => api.delete(`/employer/team/members/${userId}`),
    onSuccess: refresh,
    meta: { successMessage: 'Đã gỡ thành viên' },
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api.delete(`/employer/team/invitations/${id}`),
    onSuccess: refresh,
    meta: { successMessage: 'Đã thu hồi lời mời' },
  });
  const leave = useMutation({
    mutationFn: () => api.post('/employer/team/leave'),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: EMPLOYER_ME_KEY });
      qc.removeQueries({ queryKey: ['employer'] });
      navigate('/employer');
    },
    meta: { successMessage: 'Bạn đã rời công ty' },
  });

  if (isLoading) return <ListSkeleton rows={3} />;
  if (error || !data) return <Alert type="error">{errorMessage(error)}</Alert>;
  const isOwner = data.myRole === 'OWNER';
  const err = changeRole.error ?? remove.error ?? revoke.error ?? leave.error;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Đội tuyển dụng</h1>
        <p className="text-sm text-slate-500">
          <b>Quản trị viên</b>: sửa hồ sơ công ty, xác minh, quản lý thành viên. <b>Thành viên</b>: đăng tin và xử lý ứng viên của công ty.
        </p>
      </div>
      {err && <Alert type="error">{errorMessage(err)}</Alert>}
      {isOwner && <InviteForm />}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Thành viên ({data.members.length})</th>
              <th className="px-4 py-2 font-medium">Vai trò</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.members.map((m) => (
              <tr key={m.userId}>
                <td className="px-4 py-2">
                  <p className="font-medium">
                    {m.fullName} {m.isMe && <span className="text-xs font-normal text-slate-500">(bạn)</span>}
                    {!m.active && <span className="ml-1 rounded bg-red-100 px-1.5 text-xs text-red-700">Đã khóa</span>}
                  </p>
                  <p className="text-xs text-slate-500">{m.email}{m.position ? ` · ${m.position}` : ''}</p>
                </td>
                <td className="px-4 py-2">
                  {isOwner && !m.isMe ? (
                    <Select
                      value={m.role}
                      disabled={changeRole.isPending}
                      onChange={(e) => changeRole.mutate({ userId: m.userId, role: e.target.value as Role })}
                      options={[{ value: 'MEMBER', label: ROLE_LABEL.MEMBER }, { value: 'OWNER', label: ROLE_LABEL.OWNER }]}
                      className="w-40"
                    />
                  ) : (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${m.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>{ROLE_LABEL[m.role]}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-xs">
                  {m.isMe ? (
                    data.members.length > 1 && (
                      <button
                        onClick={() => window.confirm('Rời công ty? Bạn sẽ không còn thấy tin và ứng viên của công ty này.') && leave.mutate()}
                        className="text-red-600 hover:underline"
                      >
                        Rời công ty
                      </button>
                    )
                  ) : (
                    isOwner && (
                      <button onClick={() => window.confirm(`Gỡ ${m.fullName} khỏi công ty?`) && remove.mutate(m.userId)} className="text-red-600 hover:underline">
                        Gỡ khỏi công ty
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isOwner && data.invitations.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Lời mời đang chờ ({data.invitations.length})</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {data.invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.email}</p>
                  <p className="text-xs text-slate-500">
                    {ROLE_LABEL[i.role]} · mời ngày {formatDate(i.createdAt)}{i.invitedBy ? ` bởi ${i.invitedBy}` : ''} · hết hạn {formatDate(i.expiresAt)}
                  </p>
                </div>
                <button onClick={() => revoke.mutate(i.id)} className="text-xs text-red-600 hover:underline">Thu hồi</button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Muốn gửi lại? Mời lại cùng email — lời mời cũ sẽ tự bị thu hồi.</p>
        </section>
      )}
    </div>
  );
}
