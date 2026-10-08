import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toast';
import Pagination from '../../components/Pagination';
import RichText from '../../components/RichText';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { JOB_TYPE_LABEL, LEVEL_LABEL, formatDate, formatSalary } from '../../lib/format';
import { JOB_STATUS, StatusBadge, VERIFY_STATUS } from '../../lib/status';
import type { Paginated } from '../../lib/types';
import { Empty, ReasonModal, Tabs } from './shared';
import { ListSkeleton } from '../../components/Skeleton';

interface Row {
  id: number;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  deadline: string;
  location: string | null;
  rejectReason: string | null;
  openReports: number;
  company: { id: number; name: string; verificationStatus: string };
}
interface Detail {
  id: number;
  slug: string;
  title: string;
  status: string;
  rejectReason: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  jobType: string;
  level: string;
  experienceYears: number;
  quantity: number;
  deadline: string;
  workAddress: string | null;
  location: string | null;
  categories: string[];
  skills: string[];
  postedBy: string | null;
  applications: number;
  company: { id: number; name: string; slug: string; taxCode: string | null; verificationStatus: string; logoUrl: string | null };
}

const REJECT_PRESETS = ['Nội dung mô tả quá sơ sài', 'Mức lương không hợp lý / thiếu thông tin', 'Có dấu hiệu thu phí ứng viên', 'Thông tin liên hệ đặt trong nội dung', 'Tin trùng lặp'];

function JobDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [reasonFor, setReasonFor] = useState<'reject' | 'hide' | null>(null);
  const { data: j, isLoading } = useQuery({ queryKey: ['admin', 'job', id], queryFn: async () => (await api.get<Detail>(`/admin/jobs/${id}`)).data });
  const act = useMutation({
    mutationFn: ({ action, reason }: { action: 'approve' | 'reject' | 'hide'; reason?: string }) => api.post(`/admin/jobs/${id}/${action}`, reason ? { reason } : undefined),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setReasonFor(null);
      onClose();
      toast({ approve: 'Đã duyệt tin', reject: 'Đã từ chối tin', hide: 'Đã gỡ tin' }[v.action]);
    },
  });

  return (
    <Modal open onClose={onClose} title="Chi tiết tin tuyển dụng">
      {isLoading || !j ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : (
        <div className="space-y-4 text-sm">
          {act.isError && !reasonFor && <Alert type="error">{errorMessage(act.error)}</Alert>}
          <div className="flex items-center gap-3">
            <CompanyLogo name={j.company.name} url={j.company.logoUrl} size={44} />
            <div>
              <p className="font-medium">{j.company.name}</p>
              <p className="text-xs text-slate-500">
                MST: {j.company.taxCode ?? '—'} · <StatusBadge map={VERIFY_STATUS} value={j.company.verificationStatus} />
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{j.title}</h3>
            <div className="mt-1 flex flex-wrap gap-2"><StatusBadge map={JOB_STATUS} value={j.status} /></div>
          </div>
          {j.rejectReason && <Alert type="error">{j.rejectReason}</Alert>}
          <dl className="grid grid-cols-2 gap-2">
            {[
              ['Lương', formatSalary(j.salaryMin, j.salaryMax, j.salaryNegotiable)],
              ['Địa điểm', [j.location, j.workAddress].filter(Boolean).join(' – ') || '—'],
              ['Loại hình', JOB_TYPE_LABEL[j.jobType]],
              ['Cấp bậc', LEVEL_LABEL[j.level]],
              ['Kinh nghiệm', `${j.experienceYears} năm`],
              ['Số lượng', String(j.quantity)],
              ['Hạn nộp', formatDate(j.deadline)],
              ['Người đăng', j.postedBy ?? '—'],
              ['Ngành', j.categories.join(', ') || '—'],
              ['Kỹ năng', j.skills.join(', ') || '—'],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {([['Mô tả', j.description], ['Yêu cầu', j.requirements], ['Quyền lợi', j.benefits]] as const).map(([k, v]) =>
            v ? (
              <div key={k}>
                <p className="font-medium">{k}</p>
                <div className="max-h-48 overflow-y-auto rounded bg-slate-50 p-2 text-slate-700"><RichText value={v} /></div>
              </div>
            ) : null,
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            {j.status === 'APPROVED' && <a href={`/jobs/${j.slug}`} target="_blank" rel="noreferrer" className="px-3 py-2 text-brand-600 hover:underline">Xem trang công khai</a>}
            {j.status === 'PENDING' && (
              <>
                <Button variant="outline" className="!border-red-300 !text-red-600" onClick={() => { act.reset(); setReasonFor('reject'); }}>Từ chối</Button>
                <Button loading={act.isPending} onClick={() => act.mutate({ action: 'approve' })}>Duyệt tin</Button>
              </>
            )}
            {j.status === 'APPROVED' && <Button variant="outline" className="!border-red-300 !text-red-600" onClick={() => { act.reset(); setReasonFor('hide'); }}>Gỡ tin vi phạm</Button>}
          </div>
        </div>
      )}
      <ReasonModal
        open={!!reasonFor}
        title={reasonFor === 'hide' ? 'Gỡ tin vi phạm' : 'Từ chối tin'}
        label="Lý do (nhà tuyển dụng sẽ thấy)"
        confirmText={reasonFor === 'hide' ? 'Gỡ tin' : 'Từ chối'}
        danger
        presets={REJECT_PRESETS}
        pending={act.isPending}
        error={act.error}
        onClose={() => setReasonFor(null)}
        onConfirm={(reason) => act.mutate({ action: reasonFor!, reason })}
      />
    </Modal>
  );
}

export default function JobsModerationPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING';
  const page = Number(params.get('page') ?? 1);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'jobs', status, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/admin/jobs', { params: { status: status || undefined, page, limit: 15 } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Duyệt tin tuyển dụng</h1>
      <Tabs
        value={status}
        onChange={(v) => setParams({ status: v })}
        tabs={[{ value: 'PENDING', label: 'Chờ duyệt' }, { value: 'APPROVED', label: 'Đang hiển thị' }, { value: 'REJECTED', label: 'Bị từ chối' }, { value: '', label: 'Tất cả' }]}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {data.items.map((j) => (
              <li key={j.id}>
                <button onClick={() => setOpenId(j.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{j.title}</p>
                    <p className="text-sm text-slate-500">
                      {j.company.name} {j.company.verificationStatus === 'VERIFIED' && <span className="text-brand-600">✔</span>} · {j.location ?? '—'} · cập nhật {formatDate(j.updatedAt)}
                    </p>
                  </div>
                  {j.openReports > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">⚑ {j.openReports} báo cáo</span>}
                  <StatusBadge map={JOB_STATUS} value={j.status} />
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setParams({ status, page: String(p) })} />
        </>
      ) : (
        <Empty>{status === 'PENDING' ? 'Không có tin nào chờ duyệt.' : 'Không có tin nào.'}</Empty>
      )}
      {openId && <JobDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
