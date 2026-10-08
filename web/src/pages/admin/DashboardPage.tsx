import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ColumnChart from '../../components/charts/ColumnChart';
import { ADMIN_OVERVIEW_KEY } from '../../layouts/AdminLayout';
import { api } from '../../lib/api';
import type { AdminOverview } from './types';

type Metric = 'users' | 'jobs' | 'applications';
type Growth = { period: 'day' | 'month' } & Record<Metric, { key: string; count: number }[]>;
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'users', label: 'Người dùng mới', unit: 'người' },
  { key: 'jobs', label: 'Tin tuyển dụng mới', unit: 'tin' },
  { key: 'applications', label: 'Đơn ứng tuyển', unit: 'đơn' },
];

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value.toLocaleString('vi-VN')}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [metric, setMetric] = useState<Metric>('users');
  const [period, setPeriod] = useState<'day' | 'month'>('day');
  const { data: o } = useQuery({ queryKey: ADMIN_OVERVIEW_KEY, queryFn: async () => (await api.get<AdminOverview>('/admin/dashboard')).data });
  const { data: g } = useQuery({
    queryKey: ['admin', 'growth', period],
    queryFn: async () => (await api.get<Growth>('/admin/dashboard/growth', { params: { period } })).data,
    placeholderData: keepPreviousData,
  });

  if (!o) return <p className="text-slate-500">Đang tải…</p>;
  const m = METRICS.find((x) => x.key === metric)!;
  const series = g?.[metric] ?? [];
  const total = series.reduce((a, b) => a + b.count, 0);
  const todo = [
    { n: o.todo.pendingJobs, label: 'tin tuyển dụng chờ duyệt', to: '/admin/jobs' },
    { n: o.todo.pendingCompanies, label: 'công ty chờ xác minh', to: '/admin/companies' },
    { n: o.todo.openReports, label: 'báo cáo vi phạm chưa xử lý', to: '/admin/reports' },
    { n: o.todo.pendingReviews, label: 'đánh giá công ty chờ duyệt', to: '/admin/reviews' },
    { n: o.todo.pendingOrders, label: 'đơn mua gói chờ xác nhận thanh toán', to: '/admin/billing' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tổng quan hệ thống</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Người dùng" value={o.users.total} sub={`${o.users.candidates} ứng viên · ${o.users.employers} NTD · ${o.users.admins} admin`} />
        <Tile label="Công ty" value={o.companies.total} sub={`${o.companies.verified} đã xác minh`} />
        <Tile label="Tin tuyển dụng" value={o.jobs.total} sub={`${o.jobs.open} đang hiển thị`} />
        <Tile label="Đơn ứng tuyển" value={o.applications.total} sub="tổng cộng" />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Việc cần xử lý</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {todo.map((t) => (
            <li key={t.to}>
              <Link to={t.to} className={`flex items-center gap-3 rounded-lg border p-3 hover:border-brand-600/40 ${t.n ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                <span className="text-2xl font-bold tabular-nums">{t.n}</span>
                <span className="text-sm text-slate-600">{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{m.label}</h2>
            <p className="text-xs text-slate-500">
              {period === 'day' ? '30 ngày gần nhất' : '12 tháng gần nhất'} · tổng {total.toLocaleString('vi-VN')} {m.unit}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm">
              {METRICS.map((x) => (
                <button key={x.key} onClick={() => setMetric(x.key)} className={`rounded-md px-2.5 py-1 ${metric === x.key ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>
                  {x.label.replace(' mới', '')}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm">
              {(['day', 'month'] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-2.5 py-1 ${period === p ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>
                  {p === 'day' ? 'Theo ngày' : 'Theo tháng'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <ColumnChart
            unit={m.unit}
            labelEvery={period === 'day' ? 5 : 1}
            data={series.map((d) => ({
              key: d.key,
              label: period === 'day' ? `${d.key.slice(8, 10)}/${d.key.slice(5, 7)}` : `T${Number(d.key.slice(5, 7))}`,
              tooltip: period === 'day' ? new Date(`${d.key}T00:00:00`).toLocaleDateString('vi-VN') : `Tháng ${Number(d.key.slice(5, 7))}/${d.key.slice(0, 4)}`,
              value: d.count,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
