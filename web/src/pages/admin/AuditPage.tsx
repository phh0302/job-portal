import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Pagination from '../../components/Pagination';
import Select from '../../components/Select';
import { api } from '../../lib/api';
import type { Paginated } from '../../lib/types';
import { Empty } from './shared';
import { ListSkeleton } from '../../components/Skeleton';

interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: number; email: string } | null;
}

const ACTION_LABEL: Record<string, string> = {
  JOB_APPROVE: 'Duyệt tin',
  JOB_REJECT: 'Từ chối tin',
  JOB_HIDE: 'Gỡ tin',
  COMPANY_VERIFY: 'Xác minh công ty',
  COMPANY_REJECT: 'Từ chối xác minh',
  USER_LOCK: 'Khóa tài khoản',
  USER_UNLOCK: 'Mở khóa tài khoản',
  ADMIN_CREATE: 'Tạo admin',
  REPORT_RESOLVE: 'Xử lý báo cáo',
  REPORT_DISMISS: 'Bỏ qua báo cáo',
  PAGE_UPDATE: 'Sửa trang tĩnh',
  SETTINGS_UPDATE: 'Sửa cấu hình',
};
const label = (a: string) =>
  ACTION_LABEL[a] ?? a.replace(/^(CATEGORY|SKILL|LOCATION)_(CREATE|UPDATE|DELETE)$/, (_, k, op) => `${{ CREATE: 'Thêm', UPDATE: 'Sửa', DELETE: 'Xóa' }[op as string]} ${{ CATEGORY: 'ngành nghề', SKILL: 'kỹ năng', LOCATION: 'tỉnh/thành' }[k as string]}`);

function summary(m: Record<string, unknown> | null) {
  if (!m) return '';
  return Object.entries(m)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data: actions } = useQuery({ queryKey: ['admin', 'audit-actions'], queryFn: async () => (await api.get<string[]>('/admin/audit-logs/actions')).data });
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page, action],
    queryFn: async () => (await api.get<Paginated<Log>>('/admin/audit-logs', { params: { page, limit: 30, action: action || undefined } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Nhật ký thao tác</h1>
        <div className="w-60">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Mọi thao tác" options={(actions ?? []).map((a) => ({ value: a, label: label(a) }))} />
        </div>
      </div>
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Thời gian</th>
                  <th className="px-4 py-2 font-medium">Người thực hiện</th>
                  <th className="px-4 py-2 font-medium">Thao tác</th>
                  <th className="px-4 py-2 font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">{new Date(l.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-2">{l.actor?.email ?? '—'}<div className="text-xs text-slate-400">{l.ipAddress}</div></td>
                    <td className="px-4 py-2 font-medium">{label(l.action)}<div className="text-xs font-normal text-slate-400">{l.entityType} #{l.entityId}</div></td>
                    <td className="max-w-md break-words px-4 py-2 text-slate-600">{summary(l.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <Empty>Chưa có thao tác nào.</Empty>
      )}
    </div>
  );
}
