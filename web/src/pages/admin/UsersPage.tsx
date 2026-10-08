import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { ROLE_LABEL } from '../../auth/types';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toast';
import Pagination from '../../components/Pagination';
import Select from '../../components/Select';
import { Alert, Button, Field, PASSWORD_HINT } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, timeAgo } from '../../lib/format';
import type { Paginated } from '../../lib/types';
import { Empty, ReasonModal } from './shared';
import type { AdminUserRow } from './types';
import { ListSkeleton } from '../../components/Skeleton';

type UserDetail = AdminUserRow & {
  lockedReason: string | null;
  lastLoginAt: string | null;
  applications?: number;
  candidate?: { phone: string | null; headline: string | null; location: string | null; isPublic: boolean };
  employer?: { phone: string | null; position: string | null };
};

function StatusPill({ u }: { u: Pick<AdminUserRow, 'status'> }) {
  return u.status === 'LOCKED' ? (
    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Đã khóa</span>
  ) : (
    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Hoạt động</span>
  );
}

function UserModal({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [locking, setLocking] = useState(false);
  const { data: u } = useQuery({ queryKey: ['admin', 'user', id], queryFn: async () => (await api.get<UserDetail>(`/admin/users/${id}`)).data });
  const act = useMutation({
    mutationFn: ({ action, reason }: { action: 'lock' | 'unlock'; reason?: string }) => api.post<UserDetail>(`/admin/users/${id}/${action}`, reason ? { reason } : undefined),
    onSuccess: (res) => {
      qc.setQueryData(['admin', 'user', id], res.data);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setLocking(false);
      toast(res.data.status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
    },
  });

  const canAct = u && u.id !== me?.id && !u.isSuperAdmin && (u.role !== 'ADMIN' || me?.isSuperAdmin);
  return (
    <Modal open onClose={onClose} title="Thông tin người dùng">
      {!u ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : (
        <div className="space-y-3 text-sm">
          {act.isError && !locking && <Alert type="error">{errorMessage(act.error)}</Alert>}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{u.fullName ?? u.email}</p>
            <StatusPill u={u} />
            {u.isSuperAdmin && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Super admin</span>}
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {[
              ['Email', u.email + (u.emailVerified ? ' ✔' : ' (chưa xác minh)')],
              ['Vai trò', ROLE_LABEL[u.role]],
              ['Ngày tạo', formatDate(u.createdAt)],
              ['Đăng nhập gần nhất', u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Chưa đăng nhập'],
              ...(u.candidate ? [['Điện thoại', u.candidate.phone ?? '—'], ['Tiêu đề', u.candidate.headline ?? '—'], ['Số đơn đã nộp', String(u.applications ?? 0)], ['Hồ sơ công khai', u.candidate.isPublic ? 'Có' : 'Không']] : []),
              ...(u.employer ? [['Điện thoại', u.employer.phone ?? '—'], ['Chức vụ', u.employer.position ?? '—']] : []),
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="break-all">{v}</dd></div>
            ))}
          </dl>
          {u.company && (
            <p>Công ty: <Link to={`/companies/${u.company.slug}`} target="_blank" className="text-brand-600 hover:underline">{u.company.name}</Link></p>
          )}
          {u.lockedReason && <Alert type="error">Lý do khóa: {u.lockedReason}</Alert>}
          {canAct && (
            <div className="flex justify-end border-t border-slate-100 pt-3">
              {u.status === 'LOCKED' ? (
                <Button loading={act.isPending} onClick={() => act.mutate({ action: 'unlock' })}>Mở khóa</Button>
              ) : (
                <Button className="!bg-red-600 hover:!bg-red-700" onClick={() => { act.reset(); setLocking(true); }}>Khóa tài khoản</Button>
              )}
            </div>
          )}
        </div>
      )}
      <ReasonModal
        open={locking}
        title="Khóa tài khoản"
        label="Lý do khóa"
        confirmText="Khóa"
        danger
        presets={['Đăng tin lừa đảo', 'Spam / quấy rối người dùng', 'Thông tin giả mạo']}
        pending={act.isPending}
        error={act.error}
        onClose={() => setLocking(false)}
        onConfirm={(reason) => act.mutate({ action: 'lock', reason })}
        extra={<p className="text-sm text-slate-600">Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được nữa.</p>}
      />
    </Modal>
  );
}

function CreateAdminModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', password: '', isSuperAdmin: false });
  const mut = useMutation({
    mutationFn: () => api.post('/admin/admins', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
    meta: { successMessage: 'Đã tạo tài khoản quản trị viên' },
  });
  return (
    <Modal open onClose={onClose} title="Tạo tài khoản quản trị viên">
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
        <Field label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Mật khẩu tạm" type="text" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={PASSWORD_HINT} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isSuperAdmin} onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })} />
          Super admin (được tạo / khóa admin khác)
        </label>
        <p className="text-xs text-slate-500">Hãy gửi mật khẩu tạm cho người này và nhắc đổi mật khẩu sau lần đăng nhập đầu.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={mut.isPending}>Tạo</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const [kw, setKw] = useState(params.get('q') ?? '');
  useEffect(() => setKw(params.get('q') ?? ''), [params]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const page = Number(params.get('page') ?? 1);
  const query = { q: params.get('q') || undefined, role: params.get('role') || undefined, status: params.get('status') || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: async () => (await api.get<Paginated<AdminUserRow>>('/admin/users', { params: { ...query, page, limit: 20 } })).data,
    placeholderData: keepPreviousData,
  });
  const setFilter = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    n.delete('page');
    setParams(n);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Người dùng</h1>
        {me?.isSuperAdmin && <Button onClick={() => setCreating(true)}>+ Tạo admin</Button>}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setFilter('q', kw.trim()); }} className="flex gap-2">
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Email, họ tên, công ty…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
          <button className="rounded-lg bg-brand-600 px-3 text-sm text-white">Tìm</button>
        </form>
        <Select value={params.get('role') ?? ''} onChange={(e) => setFilter('role', e.target.value)} placeholder="Mọi vai trò" options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
        <Select value={params.get('status') ?? ''} onChange={(e) => setFilter('status', e.target.value)} placeholder="Mọi trạng thái" options={[{ value: 'ACTIVE', label: 'Hoạt động' }, { value: 'LOCKED', label: 'Đã khóa' }]} />
      </div>
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Người dùng</th>
                  <th className="px-4 py-2 font-medium">Vai trò</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((u) => (
                  <tr key={u.id} onClick={() => setOpenId(u.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-medium">{u.fullName ?? '—'}</p>
                      <p className="text-xs text-slate-500">{u.email}{u.company ? ` · ${u.company.name}` : ''}</p>
                    </td>
                    <td className="px-4 py-2">{ROLE_LABEL[u.role]}{u.isSuperAdmin && <span className="ml-1 text-xs text-purple-600">(super)</span>}</td>
                    <td className="px-4 py-2"><StatusPill u={u} /></td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n); }} />
        </>
      ) : (
        <Empty>Không tìm thấy người dùng.</Empty>
      )}
      {openId && <UserModal id={openId} onClose={() => setOpenId(null)} />}
      {creating && <CreateAdminModal onClose={() => setCreating(false)} />}
    </div>
  );
}
