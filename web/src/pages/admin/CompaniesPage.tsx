import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Pagination from '../../components/Pagination';
import { toast } from '../../components/Toast';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { StatusBadge, VERIFY_STATUS } from '../../lib/status';
import type { Paginated } from '../../lib/types';
import { openSignedFile } from '../../lib/files';
import { Empty, ReasonModal, Tabs } from './shared';
import { ListSkeleton } from '../../components/Skeleton';

interface Row {
  id: number;
  name: string;
  slug: string;
  taxCode: string | null;
  website: string | null;
  address: string | null;
  location: string | null;
  logoUrl: string | null;
  verificationStatus: string;
  verificationNote: string | null;
  hasLicense: boolean;
  updatedAt: string;
  jobs: number;
  employers: number;
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING';
  const page = Number(params.get('page') ?? 1);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'companies', status, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/admin/companies', { params: { status: status || undefined, page, limit: 15 } })).data,
    placeholderData: keepPreviousData,
  });
  const act = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'verify' | 'reject'; reason?: string }) => api.post(`/admin/companies/${id}/${action}`, reason ? { reason } : undefined),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setRejecting(null);
      toast(v.action === 'verify' ? 'Đã xác minh công ty' : 'Đã từ chối xác minh');
    },
  });
  const license = useMutation({ mutationFn: (c: Row) => openSignedFile(`/admin/companies/${c.id}/license-link`, 'view') });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Xác minh công ty</h1>
      <Tabs
        value={status}
        onChange={(v) => setParams({ status: v })}
        tabs={[{ value: 'PENDING', label: 'Chờ xác minh' }, { value: 'VERIFIED', label: 'Đã xác minh' }, { value: 'REJECTED', label: 'Bị từ chối' }, { value: 'UNVERIFIED', label: 'Chưa gửi' }, { value: '', label: 'Tất cả' }]}
      />
      {(act.isError && !rejecting) || license.isError ? <Alert type="error">{errorMessage(act.error ?? license.error)}</Alert> : null}
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="space-y-3">
            {data.items.map((c) => (
              <div key={c.id} className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <CompanyLogo name={c.name} url={c.logoUrl} size={52} />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/companies/${c.slug}`} target="_blank" className="font-semibold hover:text-brand-600">{c.name}</Link>
                    <StatusBadge map={VERIFY_STATUS} value={c.verificationStatus} />
                  </div>
                  <p className="text-slate-600">MST: <b>{c.taxCode ?? '—'}</b> · {c.employers} tài khoản NTD · {c.jobs} tin</p>
                  <p className="text-slate-500">{[c.address, c.location].filter(Boolean).join(', ') || '—'}{c.website && <> · <a href={c.website} target="_blank" rel="noreferrer nofollow" className="text-brand-600">{c.website}</a></>}</p>
                  <p className="text-xs text-slate-400">Cập nhật {formatDate(c.updatedAt)}</p>
                  {c.verificationNote && <p className="mt-1 text-xs text-red-600">Lý do từ chối: {c.verificationNote}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  {c.hasLicense && <button onClick={() => license.mutate(c)} className="text-brand-600 hover:underline">Xem giấy phép KD</button>}
                  {c.verificationStatus === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => { act.reset(); setRejecting(c); }} className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50">Từ chối</button>
                      <button disabled={act.isPending} onClick={() => act.mutate({ id: c.id, action: 'verify' })} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">Xác minh</button>
                    </div>
                  )}
                  {c.verificationStatus === 'VERIFIED' && (
                    <button onClick={() => { act.reset(); setRejecting(c); }} className="text-xs text-red-600 hover:underline">Thu hồi xác minh</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setParams({ status, page: String(p) })} />
        </>
      ) : (
        <Empty>Không có công ty nào.</Empty>
      )}
      <ReasonModal
        open={!!rejecting}
        title={`Từ chối xác minh: ${rejecting?.name ?? ''}`}
        label="Lý do (nhà tuyển dụng sẽ thấy)"
        confirmText="Từ chối"
        danger
        presets={['Giấy phép không rõ / không đọc được', 'Mã số thuế không khớp giấy phép', 'Tên công ty không khớp giấy phép', 'Giấy phép đã hết hiệu lực']}
        pending={act.isPending}
        error={act.error}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => rejecting && act.mutate({ id: rejecting.id, action: 'reject', reason })}
      />
    </div>
  );
}
