import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Alert, Button, Field } from '../../components/ui';
import { EMPLOYER_ME_KEY } from '../../layouts/EmployerLayout';
import { api, errorMessage } from '../../lib/api';
import type { EmployerMe } from './types';

function Form({ me }: { me: EmployerMe }) {
  const qc = useQueryClient();
  const { user, reloadUser } = useAuth();
  const [form, setForm] = useState({ fullName: me.profile.fullName, phone: me.profile.phone ?? '', position: me.profile.position ?? '' });
  const save = useMutation({
    mutationFn: async () => (await api.patch<EmployerMe>('/employer/profile', form)).data,
    onSuccess: (d) => {
      qc.setQueryData(EMPLOYER_ME_KEY, d);
      reloadUser().catch(() => undefined);
    },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      {save.isError && <div className="sm:col-span-2"><Alert type="error">{errorMessage(save.error)}</Alert></div>}
      {save.isSuccess && <div className="sm:col-span-2"><Alert type="success">Đã lưu</Alert></div>}
      <Field label="Email đăng nhập" value={user?.email ?? ''} disabled />
      <Field label="Họ và tên *" value={form.fullName} onChange={set('fullName')} required maxLength={150} />
      <Field label="Số điện thoại" value={form.phone} onChange={set('phone')} maxLength={20} />
      <Field label="Chức vụ" value={form.position} onChange={set('position')} maxLength={100} />
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>Lưu</Button>
        <Link to="/account/change-password" className="text-sm text-brand-600 hover:underline">Đổi mật khẩu</Link>
      </div>
    </form>
  );
}

export default function AccountPage() {
  const { data: me } = useQuery({ queryKey: EMPLOYER_ME_KEY, queryFn: async () => (await api.get<EmployerMe>('/employer/me')).data });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tài khoản</h1>
      {me ? <Form me={me} /> : <p className="text-slate-500">Đang tải…</p>}
    </div>
  );
}
