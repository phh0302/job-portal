import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';

interface Page {
  id: number;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  updatedAt: string;
}
interface SettingDef {
  key: string;
  label: string;
  type: 'number' | 'string';
  min?: number;
  max: number;
}
interface SettingsRes {
  values: Record<string, number | string>;
  definitions: SettingDef[];
}

function PageEditor({ page }: { page: Page }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [isPublished, setPublished] = useState(page.isPublished);
  const save = useMutation({
    mutationFn: () => api.put(`/admin/pages/${page.slug}`, { title, content, isPublished }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      qc.invalidateQueries({ queryKey: ['pages'] });
    },
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
      {save.isError && <Alert type="error">{errorMessage(save.error)}</Alert>}
      {save.isSuccess && <Alert type="success">Đã lưu trang</Alert>}
      <Field label="Tiêu đề" value={title} onChange={(e) => { setTitle(e.target.value); save.reset(); }} required maxLength={200} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Nội dung</span>
        <textarea value={content} onChange={(e) => { setContent(e.target.value); save.reset(); }} rows={14} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-600" />
        <span className="text-xs text-slate-500">Xuống dòng để tách đoạn; dòng bắt đầu bằng "- " hiển thị dạng danh sách; "## " là tiêu đề phụ.</span>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setPublished(e.target.checked)} /> Hiển thị công khai
        </label>
        <Button type="submit" loading={save.isPending}>Lưu trang</Button>
        <Link to={`/pages/${page.slug}`} target="_blank" className="text-sm text-brand-600 hover:underline">Xem trang →</Link>
        <span className="text-xs text-slate-400">Cập nhật {formatDate(page.updatedAt)}</span>
      </div>
    </form>
  );
}

function SettingsForm({ data }: { data: SettingsRes }) {
  const qc = useQueryClient();
  const [values, setValues] = useState(data.values);
  const save = useMutation({
    mutationFn: async () => (await api.put<SettingsRes>('/admin/settings', values)).data,
    onSuccess: (d) => {
      qc.setQueryData(['admin', 'settings'], d);
      qc.invalidateQueries({ queryKey: ['public-settings'] });
    },
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
      {save.isError && <div className="sm:col-span-2"><Alert type="error">{errorMessage(save.error)}</Alert></div>}
      {save.isSuccess && <div className="sm:col-span-2"><Alert type="success">Đã lưu cấu hình</Alert></div>}
      {data.definitions.map((d) => (
        <div key={d.key} className={d.type === 'string' ? 'sm:col-span-2' : ''}>
          <Field
            label={d.label}
            type={d.type === 'number' ? 'number' : 'text'}
            min={d.min}
            max={d.type === 'number' ? d.max : undefined}
            maxLength={d.type === 'string' ? d.max : undefined}
            value={String(values[d.key] ?? '')}
            onChange={(e) => { setValues({ ...values, [d.key]: d.type === 'number' ? Number(e.target.value) : e.target.value }); save.reset(); }}
          />
        </div>
      ))}
      <div className="sm:col-span-2">
        <Button type="submit" loading={save.isPending}>Lưu cấu hình</Button>
      </div>
    </form>
  );
}

export default function ContentPage() {
  const { data: pages } = useQuery({ queryKey: ['admin', 'pages'], queryFn: async () => (await api.get<Page[]>('/admin/pages')).data });
  const { data: settings } = useQuery({ queryKey: ['admin', 'settings'], queryFn: async () => (await api.get<SettingsRes>('/admin/settings')).data });
  const [slug, setSlug] = useState<string | null>(null);
  const current = pages?.find((p) => p.slug === (slug ?? pages[0]?.slug));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trang & cấu hình</h1>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Cấu hình hệ thống</h2>
        <p className="mb-4 text-sm text-slate-500">Banner trang chủ, thông báo chung, giới hạn tin đăng và upload.</p>
        {settings ? <SettingsForm data={settings} /> : <p className="text-slate-500">Đang tải…</p>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Trang tĩnh</h2>
        <div className="my-3 flex flex-wrap gap-2">
          {pages?.map((p) => (
            <button key={p.slug} onClick={() => setSlug(p.slug)} className={`rounded-lg border px-3 py-1.5 text-sm ${current?.slug === p.slug ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-300'}`}>
              {p.title}
            </button>
          ))}
        </div>
        {current ? <PageEditor key={current.slug} page={current} /> : <p className="text-sm text-slate-500">Chưa có trang nào — chạy lại <code>npm run seed</code> để tạo trang mặc định.</p>}
      </section>
    </div>
  );
}
