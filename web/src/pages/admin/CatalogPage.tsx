import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { Tabs } from './shared';
import { ListSkeleton } from '../../components/Skeleton';

type Kind = 'categories' | 'skills' | 'locations';
interface Item {
  id: number;
  name: string;
  slug: string;
  usage: number;
  icon?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}
const TABS: { value: Kind; label: string; usageLabel: string }[] = [
  { value: 'categories', label: 'Ngành nghề', usageLabel: 'tin / thông báo' },
  { value: 'skills', label: 'Kỹ năng', usageLabel: 'tin / hồ sơ' },
  { value: 'locations', label: 'Tỉnh/thành', usageLabel: 'lượt dùng' },
];

function Row({ kind, item, onError }: { kind: Kind; item: Item; onError: (e: unknown) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder ?? 0));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'catalog', kind] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
  };
  const save = useMutation({
    mutationFn: (body: object) => api.patch(`/admin/${kind}/${item.id}`, body),
    onSuccess: () => { setEditing(false); refresh(); },
    meta: { successMessage: 'Đã lưu' },
    onError,
  });
  const del = useMutation({ mutationFn: () => api.delete(`/admin/${kind}/${item.id}`), onSuccess: refresh, onError });

  return (
    <tr className={item.isActive === false ? 'text-slate-400' : ''}>
      <td className="px-4 py-2">
        {editing ? (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(kind === 'locations' ? { name, sortOrder: Number(sortOrder) } : { name }); }} className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1" autoFocus maxLength={150} />
            {kind === 'locations' && <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1" title="Thứ tự" />}
            <button className="text-brand-600">Lưu</button>
            <button type="button" onClick={() => { setEditing(false); setName(item.name); }} className="text-slate-500">Hủy</button>
          </form>
        ) : (
          <>
            {item.name}
            {item.isActive === false && <span className="ml-2 text-xs">(đang ẩn)</span>}
          </>
        )}
      </td>
      {kind === 'locations' && <td className="px-4 py-2 tabular-nums">{item.sortOrder}</td>}
      <td className="px-4 py-2 text-right tabular-nums">{item.usage}</td>
      <td className="px-4 py-2">
        {!editing && (
          <div className="flex justify-end gap-3 text-xs">
            <button onClick={() => setEditing(true)} className="text-brand-600 hover:underline">Sửa</button>
            {kind === 'categories' && (
              <button onClick={() => save.mutate({ name: item.name, isActive: !item.isActive })} className="text-slate-600 hover:underline">
                {item.isActive ? 'Ẩn' : 'Hiện'}
              </button>
            )}
            <button
              onClick={() => window.confirm(`Xóa "${item.name}"?`) && del.mutate()}
              disabled={item.usage > 0}
              title={item.usage > 0 ? 'Đang được dùng, không xóa được' : undefined}
              className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
            >
              Xóa
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function CatalogPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>('categories');
  const [name, setName] = useState('');
  const [error, setError] = useState<unknown>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'catalog', kind], queryFn: async () => (await api.get<Item[]>(`/admin/${kind}`)).data });
  const create = useMutation({
    mutationFn: () => api.post(`/admin/${kind}`, { name }),
    onSuccess: () => {
      setName('');
      setError(null);
      qc.invalidateQueries({ queryKey: ['admin', 'catalog', kind] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: setError,
    meta: { successMessage: 'Đã thêm' },
  });
  const tab = TABS.find((t) => t.value === kind)!;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Danh mục</h1>
      <Tabs value={kind} onChange={(v) => { setKind(v); setError(null); }} tabs={TABS.map((t) => ({ ...t, count: t.value === kind ? data?.length : undefined }))} />
      {!!error && <Alert type="error">{errorMessage(error)}</Alert>}
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Thêm ${tab.label.toLowerCase()} mới…`} maxLength={150} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        <button disabled={!name.trim() || create.isPending} className="rounded-lg bg-brand-600 px-4 text-white disabled:opacity-50">Thêm</button>
      </form>
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Tên</th>
                {kind === 'locations' && <th className="px-4 py-2 font-medium">Thứ tự</th>}
                <th className="px-4 py-2 text-right font-medium">Đang dùng ({tab.usageLabel})</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((i) => <Row key={i.id} kind={kind} item={i} onError={setError} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
