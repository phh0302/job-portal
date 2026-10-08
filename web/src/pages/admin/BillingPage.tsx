import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { ORDER_STATUS, formatVnd, type Order, type OrderStatus, type Plan } from '../../lib/billing';
import { formatDate } from '../../lib/format';
import type { Paginated } from '../../lib/types';
import { Empty, ReasonModal, Tabs } from './shared';

type Row = Order & { company: { id: number; name: string; slug: string } };
type OrdersData = Paginated<Row> & { revenueThisMonth: number; paidThisMonth: number };

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600';

function PlanEditor({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ ...plan, description: plan.description ?? '' });
  const save = useMutation({
    mutationFn: async () =>
      api.put(`/admin/billing/plans/${plan.id}`, {
        name: f.name,
        description: f.description,
        price: Number(f.price),
        durationDays: Number(f.durationDays),
        featuredCredits: Number(f.featuredCredits),
        contactCredits: Number(f.contactCredits),
        isActive: f.isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
      onClose();
    },
    meta: { successMessage: 'Đã lưu gói' },
  });
  const num = (k: 'price' | 'durationDays' | 'featuredCredits' | 'contactCredits', label: string) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input type="number" min={0} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className={input} />
    </label>
  );
  return (
    <Modal open onClose={onClose} title={`Sửa gói ${plan.code}`}>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        {save.isError && <Alert type="error">{errorMessage(save.error)}</Alert>}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tên gói</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} className={input} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Mô tả</span>
          <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={500} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {num('price', 'Giá (VNĐ)')}
          {num('durationDays', 'Thời hạn (ngày)')}
          {num('featuredCredits', 'Lượt tin nổi bật')}
          {num('contactCredits', 'Lượt mở liên hệ')}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
          Đang bán
        </label>
        <p className="text-xs text-slate-500">Thay đổi chỉ áp dụng cho đơn tạo sau; đơn cũ giữ giá lúc mua.</p>
        <Button type="submit" loading={save.isPending}>Lưu</Button>
      </form>
    </Modal>
  );
}

export default function AdminBillingPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | ''>('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'orders', status, q, page],
    queryFn: async () => (await api.get<OrdersData>('/admin/billing/orders', { params: { status: status || undefined, q: q || undefined, page, limit: 15 } })).data,
    placeholderData: keepPreviousData,
  });
  const { data: plans } = useQuery({ queryKey: ['admin', 'plans'], queryFn: async () => (await api.get<Plan[]>('/admin/billing/plans')).data });

  const confirm = useMutation({
    mutationFn: (id: number) => api.post(`/admin/billing/orders/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
    meta: { successMessage: 'Đã xác nhận thanh toán – gói đã được kích hoạt' },
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/admin/billing/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setCancelling(null);
    },
    meta: { successMessage: 'Đã huỷ đơn' },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Gói dịch vụ & thanh toán</h1>
      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Doanh thu tháng này</p>
            <p className="text-2xl font-bold tabular-nums">{formatVnd(data.revenueThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Đơn đã thanh toán tháng này</p>
            <p className="text-2xl font-bold tabular-nums">{data.paidThisMonth}</p>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <Tabs
          tabs={[
            { value: 'PENDING', label: 'Chờ thanh toán' },
            { value: 'PAID', label: 'Đã thanh toán' },
            { value: 'CANCELLED', label: 'Đã huỷ' },
            { value: '', label: 'Tất cả' },
          ]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm mã đơn / tên công ty"
          className={`${input} max-w-sm`}
        />
        {(confirm.isError) && <Alert type="error">{errorMessage(confirm.error)}</Alert>}
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <Alert type="error">{errorMessage(error)}</Alert>
        ) : !data?.items.length ? (
          <Empty>Không có đơn nào.</Empty>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Mã đơn</th>
                    <th className="px-4 py-2 font-medium">Công ty</th>
                    <th className="px-4 py-2 font-medium">Gói</th>
                    <th className="px-4 py-2 text-right font-medium">Số tiền</th>
                    <th className="px-4 py-2 font-medium">Ngày tạo</th>
                    <th className="px-4 py-2 font-medium">Trạng thái</th>
                    <th className="px-4 py-2 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2 font-mono">{o.code}</td>
                      <td className="px-4 py-2">
                        <Link to={`/companies/${o.company.slug}`} target="_blank" className="hover:text-brand-600">{o.company.name}</Link>
                      </td>
                      <td className="px-4 py-2">{o.planName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatVnd(o.amount)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
                        {o.cancelReason && <p className="text-xs text-slate-500">{o.cancelReason}</p>}
                      </td>
                      <td className="px-4 py-2">
                        {o.status === 'PENDING' && (
                          <div className="flex gap-3 text-xs">
                            <button
                              onClick={() => window.confirm(`Xác nhận đã nhận ${formatVnd(o.amount)} cho đơn ${o.code}?`) && confirm.mutate(o.id)}
                              disabled={confirm.isPending}
                              className="font-medium text-green-700 hover:underline"
                            >
                              Xác nhận đã thanh toán
                            </button>
                            <button onClick={() => setCancelling(o)} className="text-red-600 hover:underline">Huỷ</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Gói dịch vụ</h2>
        <p className="text-sm text-slate-500">Thông tin tài khoản nhận chuyển khoản sửa ở "Trang & cấu hình".</p>
        <div className="grid gap-3 md:grid-cols-3">
          {plans?.map((p) => (
            <div key={p.id} className={`rounded-xl border bg-white p-4 ${p.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name} <span className="text-xs text-slate-400">({p.code})</span></p>
                  <p className="text-lg font-bold">{formatVnd(p.price)} <span className="text-xs font-normal text-slate-500">/ {p.durationDays} ngày</span></p>
                </div>
                <button onClick={() => setEditing(p)} className="text-sm text-brand-600 hover:underline">Sửa</button>
              </div>
              <p className="text-sm text-slate-600">{p.featuredCredits} tin nổi bật · {p.contactCredits} lượt mở liên hệ</p>
              {!p.isActive && <p className="text-xs text-red-600">Ngừng bán</p>}
            </div>
          ))}
        </div>
      </section>

      <ReasonModal
        open={!!cancelling}
        title={`Huỷ đơn ${cancelling?.code ?? ''}`}
        label="Lý do huỷ (gửi tới nhà tuyển dụng)"
        confirmText="Huỷ đơn"
        danger
        presets={['Không nhận được tiền chuyển khoản', 'Chuyển khoản sai số tiền', 'Theo yêu cầu của khách hàng']}
        pending={cancel.isPending}
        error={cancel.isError ? cancel.error : null}
        onClose={() => setCancelling(null)}
        onConfirm={(reason) => cancelling && cancel.mutate({ id: cancelling.id, reason })}
      />
      {editing && <PlanEditor plan={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
