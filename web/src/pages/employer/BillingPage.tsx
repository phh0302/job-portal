import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListSkeleton } from '../../components/Skeleton';
import { toast } from '../../components/Toast';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { ORDER_STATUS, formatVnd, vietQrUrl, type Order, type Plan } from '../../lib/billing';
import { formatDate } from '../../lib/format';

interface Overview {
  canPurchase: boolean;
  plan: { name: string | null; expiresAt: string | null; active: boolean; featuredCredits: number; contactCredits: number };
  bank: { bankName: string; bankCode: string; accountNo: string; accountName: string };
  featureDays: number;
  orders: Order[];
}

const KEY = ['employer', 'billing'];

/** Ảnh QR VietQR; lỗi tải ảnh (mất mạng, sai mã ngân hàng) → ẩn, vẫn còn thông tin chuyển khoản thủ công */
function QrImage({ url, code }: { url: string | null; code: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh QR lớn" className="shrink-0">
      <img
        src={url}
        alt={`Mã QR chuyển khoản cho đơn ${code}`}
        width={180}
        height={180}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-[180px] w-[180px] rounded-lg border border-slate-200 bg-white object-contain"
      />
    </a>
  );
}

function copy(text: string) {
  void navigator.clipboard?.writeText(text).then(() => toast(`Đã sao chép: ${text}`));
}

export default function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<Overview>('/employer/billing')).data });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get<Plan[]>('/plans')).data });

  const buy = useMutation({
    mutationFn: async (planId: number) => (await api.post<Order>('/employer/billing/orders', { planId })).data,
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast(`Đã tạo đơn ${o.code}. Vui lòng chuyển khoản theo hướng dẫn.`);
    },
  });
  const cancel = useMutation({
    mutationFn: async (id: number) => api.post(`/employer/billing/orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    meta: { successMessage: 'Đã huỷ đơn' },
  });

  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError || !data) return <Alert type="error">{errorMessage(error)}</Alert>;
  const { plan, bank } = data;
  const pending = data.orders.filter((o) => o.status === 'PENDING');

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Gói dịch vụ</h1>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Gói hiện tại</p>
          <p className="text-lg font-semibold">{plan.active ? plan.name : 'Miễn phí'}</p>
          <p className="text-xs text-slate-500">
            {plan.active ? `Hết hạn ${formatDate(plan.expiresAt)}` : plan.expiresAt ? `Gói ${plan.name} đã hết hạn ${formatDate(plan.expiresAt)}` : 'Chưa mua gói nào'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Lượt đẩy tin nổi bật</p>
          <p className="text-2xl font-bold tabular-nums">{plan.active ? plan.featuredCredits : 0}</p>
          <p className="text-xs text-slate-500">Mỗi lượt: tin lên đầu kết quả {data.featureDays} ngày</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Lượt mở liên hệ ứng viên</p>
          <p className="text-2xl font-bold tabular-nums">{plan.active ? plan.contactCredits : 0}</p>
          <p className="text-xs text-slate-500">Xem email, SĐT ở "Tìm hồ sơ"</p>
        </div>
      </section>

      {pending.length > 0 && (
        <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold">Hướng dẫn thanh toán</h2>
          <p>Quét mã QR bằng app ngân hàng (đã điền sẵn số tiền và nội dung), hoặc chuyển khoản thủ công tới tài khoản dưới đây và <b>ghi đúng mã đơn</b> ở nội dung chuyển khoản. Gói được kích hoạt sau khi quản trị viên xác nhận (thường trong giờ làm việc).</p>
          <dl className="grid gap-1 sm:grid-cols-[160px_1fr]">
            <dt className="text-slate-500">Ngân hàng</dt>
            <dd>{bank.bankName}</dd>
            <dt className="text-slate-500">Số tài khoản</dt>
            <dd>
              <b className="tabular-nums">{bank.accountNo}</b>{' '}
              <button onClick={() => copy(bank.accountNo)} className="text-brand-600 hover:underline">Sao chép</button>
            </dd>
            <dt className="text-slate-500">Chủ tài khoản</dt>
            <dd>{bank.accountName}</dd>
          </dl>
          {pending.map((o) => (
            <div key={o.id} className="flex flex-col gap-4 rounded-lg bg-white p-3 sm:flex-row sm:items-center">
              <QrImage url={vietQrUrl(bank, o.amount, o.code)} code={o.code} />
              <dl className="grid flex-1 gap-1 sm:grid-cols-[120px_1fr]">
                <dt className="text-slate-500">Mã đơn (nội dung CK)</dt>
                <dd>
                  <b className="font-mono">{o.code}</b>{' '}
                  <button onClick={() => copy(o.code)} className="text-brand-600 hover:underline">Sao chép</button>
                </dd>
                <dt className="text-slate-500">Gói</dt>
                <dd>{o.planName}</dd>
                <dt className="text-slate-500">Số tiền</dt>
                <dd className="font-semibold">{formatVnd(o.amount)}</dd>
                {data.canPurchase && (
                  <dd className="sm:col-start-2">
                    <button
                      onClick={() => window.confirm(`Huỷ đơn ${o.code}?`) && cancel.mutate(o.id)}
                      disabled={cancel.isPending}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Huỷ đơn
                    </button>
                  </dd>
                )}
              </dl>
            </div>
          ))}
          <p className="text-xs text-slate-500">Đây là thanh toán giả lập – không có giao dịch thật nào được thực hiện qua hệ thống.</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Bảng giá</h2>
        {!data.canPurchase && <p className="text-sm text-slate-500">Chỉ quản trị viên công ty mới mua được gói.</p>}
        {(buy.isError || cancel.isError) && <Alert type="error">{errorMessage(buy.error ?? cancel.error)}</Alert>}
        <div className="grid gap-4 md:grid-cols-3">
          {plans?.map((p, i) => (
            <div key={p.id} className={`flex flex-col rounded-xl border bg-white p-5 ${i === 1 ? 'border-brand-600 ring-1 ring-brand-600' : 'border-slate-200'}`}>
              {i === 1 && <span className="mb-2 self-start rounded bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">Phổ biến</span>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.description && <p className="text-sm text-slate-500">{p.description}</p>}
              <p className="mt-3 text-2xl font-bold">{formatVnd(p.price)}</p>
              <p className="text-xs text-slate-500">/ {p.durationDays} ngày</p>
              <ul className="mt-3 flex-1 space-y-1 text-sm">
                <li>✓ {p.featuredCredits} lượt đẩy tin nổi bật</li>
                <li>✓ {p.contactCredits} lượt mở liên hệ ứng viên</li>
                <li>✓ Gia hạn cộng dồn nếu đang dùng gói</li>
              </ul>
              {data.canPurchase && (
                <button
                  onClick={() => window.confirm(`Tạo đơn mua gói ${p.name} – ${formatVnd(p.price)}?`) && buy.mutate(p.id)}
                  disabled={buy.isPending}
                  className="mt-4 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Mua gói
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Lịch sử đơn</h2>
        {data.orders.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đơn nào.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Mã đơn</th>
                  <th className="px-4 py-2 font-medium">Gói</th>
                  <th className="px-4 py-2 text-right font-medium">Số tiền</th>
                  <th className="px-4 py-2 font-medium">Ngày tạo</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-mono">{o.code}</td>
                    <td className="px-4 py-2">{o.planName}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatVnd(o.amount)}</td>
                    <td className="px-4 py-2">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
                      {o.cancelReason && <p className="text-xs text-slate-500">{o.cancelReason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
