import { Link } from 'react-router-dom';
import { JOB_TYPE_LABEL, daysLeft, formatSalary } from '../lib/format';
import type { JobCard as Job } from '../lib/types';
import CompanyLogo from './CompanyLogo';
import SaveJobButton from './SaveJobButton';

/** bare: không viền/nền (khi đặt trong một khung khác) */
export default function JobCard({ job, bare = false }: { job: Job; bare?: boolean }) {
  const left = daysLeft(job.deadline);
  return (
    <article
      className={`flex gap-4 ${bare ? '' : `rounded-xl border bg-white p-4 transition hover:border-brand-600/40 hover:shadow-sm ${job.featured ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}`}
    >
      <CompanyLogo name={job.company.name} url={job.company.logoUrl} size={56} />
      <div className="min-w-0 flex-1">
        <Link to={`/jobs/${job.slug}`} className="line-clamp-1 font-semibold text-slate-900 hover:text-brand-600">
          {job.title}
        </Link>
        <Link to={`/companies/${job.company.slug}`} className="line-clamp-1 text-sm text-slate-500 hover:underline">
          {job.company.name}
          {job.company.verified && <span title="Đã xác minh" className="ml-1 text-brand-600">✔</span>}
        </Link>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {job.featured && <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">★ Nổi bật</span>}
          {job.company.response?.fast && (
            <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700" title={`Phản hồi ${job.company.response.rate}% hồ sơ`}>
              ⚡ Phản hồi nhanh
            </span>
          )}
          <span className="rounded bg-green-50 px-2 py-0.5 font-medium text-green-700">
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
          </span>
          {job.location && <span className="rounded bg-slate-100 px-2 py-0.5">{job.location.name}</span>}
          <span className="rounded bg-slate-100 px-2 py-0.5">{JOB_TYPE_LABEL[job.jobType]}</span>
          <span className={`rounded px-2 py-0.5 ${left <= 3 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>
            Còn {left} ngày
          </span>
        </div>
        {job.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.skills.slice(0, 5).map((s) => (
              <span key={s.id} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <SaveJobButton jobId={job.id} />
      </div>
    </article>
  );
}
