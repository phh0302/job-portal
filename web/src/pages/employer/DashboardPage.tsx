import { responseTimeText } from '../../lib/format';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ColumnChart from '../../components/charts/ColumnChart';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';

interface Stats {
  response: { rate: number | null; avgHours: number | null; sample: number; public: { fast: boolean } | null; minSample: number; overdue: number; remindDays: number };
  jobs: { total: number; open: number; pending: number; views: number };
  applications: { total: number; new: number; byStatus: Record<string, number> };
  funnel: { key: string; label: string; count: number; rate: number }[];
  daily: { date: string; count: number }[];
  topJobs: { id: number; title: string; views: number; applications: number; conversion: number }[];
}

function Tile({ label, value, sub, to }: { label: string; value: number; sub?: string; to?: string }) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value.toLocaleString('vi-VN')}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </>
  );
  const cls = 'block rounded-xl border border-slate-200 bg-white p-4';
  return to ? <Link to={to} className={`${cls} hover:border-brand-600/40`}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Chỉ số phản hồi – hiển thị công khai cho ứng viên ở tin & trang công ty */
function ResponseCard({ r }: { r: Stats['response'] }) {
  const fast = r.public?.fast;
  return (
    <section className={`rounded-xl border p-5 ${fast ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{fast ? '⚡ Công ty đang có nhãn "Phản hồi nhanh"' : 'Chỉ số phản hồi ứng viên'}</h2>
          <p className="text-xs text-slate-500">
            Hiển thị công khai trên tin tuyển dụng khi có từ {r.minSample} hồ sơ · Nhãn "Phản hồi nhanh": phản hồi ≥ 80% hồ sơ, trung bình ≤ 3 ngày
          </p>
        </div>
        {r.overdue > 0 && (
          <Link to="/employer/applications?pending=1" className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            {r.overdue} hồ sơ chờ quá {r.remindDays} ngày →
          </Link>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-xs text-slate-500">Tỉ lệ phản hồi</dt>
          <dd className="text-2xl font-bold tabular-nums">{r.rate === null ? '–' : `${r.rate}%`}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Thời gian trung bình</dt>
          <dd className="text-2xl font-bold tabular-nums">{r.avgHours === null ? '–' : responseTimeText(r.avgHours).replace('trong ', '')}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Số hồ sơ tính (90 ngày)</dt>
          <dd className="text-2xl font-bold tabular-nums">{r.sample}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-500">"Phản hồi" = chuyển hồ sơ sang Phù hợp / Phỏng vấn / Offer / Từ chối, hoặc nhắn tin cho ứng viên. Chỉ số cập nhật mỗi giờ.</p>
    </section>
  );
}

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employer', 'dashboard'],
    queryFn: async () => (await api.get<Stats>('/employer/dashboard')).data,
  });
  if (isLoading) return <p className="text-slate-500">Đang tải…</p>;
  if (error || !data) return <Alert type="error">{errorMessage(error)}</Alert>;

  const last30 = data.daily.reduce((a, d) => a + d.count, 0);
  const funnelMax = Math.max(1, data.funnel[0]?.count ?? 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <Link to="/employer/jobs/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">+ Đăng tin mới</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Tin đang tuyển" value={data.jobs.open} sub={`${data.jobs.total} tin · ${data.jobs.pending} chờ duyệt`} to="/employer/jobs?status=APPROVED" />
        <Tile label="Lượt xem tin" value={data.jobs.views} />
        <Tile label="Đơn ứng tuyển" value={data.applications.total} sub={`${last30} đơn trong 30 ngày`} to="/employer/applications" />
        <Tile label="Đơn chưa xem" value={data.applications.new} to="/employer/applications?status=SUBMITTED" />
      </div>

      <ResponseCard r={data.response} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Số đơn ứng tuyển theo ngày</h2>
        <p className="text-xs text-slate-500">30 ngày gần nhất</p>
        <div className="mt-3">
          <ColumnChart
            unit="đơn"
            data={data.daily.map((d) => ({ key: d.date, label: ddmm(d.date), tooltip: new Date(`${d.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }), value: d.count }))}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Tỷ lệ chuyển đổi</h2>
          <p className="text-xs text-slate-500">% so với tổng đơn ứng tuyển (không tính đơn đã rút)</p>
          <div className="mt-4 space-y-3">
            {data.funnel.map((f) => (
              <div key={f.key} className="grid grid-cols-[84px_1fr_88px] items-center gap-3 text-sm">
                <span className="text-slate-600">{f.label}</span>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-brand-600" style={{ width: `${(f.count / funnelMax) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">
                  {f.count} <span className="text-slate-500">({f.rate}%)</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Tin hiệu quả nhất</h2>
          {data.topJobs.length ? (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Tin</th>
                  <th className="pb-2 text-right font-medium">Xem</th>
                  <th className="pb-2 text-right font-medium">Đơn</th>
                  <th className="pb-2 text-right font-medium">Đơn/Xem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="py-2 pr-2"><Link to={`/employer/applications?jobId=${j.id}`} className="line-clamp-1 hover:text-brand-600">{j.title}</Link></td>
                    <td className="py-2 text-right tabular-nums">{j.views.toLocaleString('vi-VN')}</td>
                    <td className="py-2 text-right tabular-nums">{j.applications}</td>
                    <td className="py-2 text-right tabular-nums">{j.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Chưa có dữ liệu.</p>
          )}
        </section>
      </div>
    </div>
  );
}
