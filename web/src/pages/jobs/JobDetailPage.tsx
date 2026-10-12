import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import CompanyLogo from '../../components/CompanyLogo';
import JobCard from '../../components/JobCard';
import ReportButton from '../../components/ReportButton';
import RichText, { plainToHtml, stripHtml } from '../../components/RichText';
import SaveJobButton from '../../components/SaveJobButton';
import { Alert, Button } from '../../components/ui';
import { toast } from '../../components/Toast';
import { api, errorMessage } from '../../lib/api';
import {
  APPLICATION_STATUS,
  COMPANY_SIZE_LABEL,
  JOB_TYPE_LABEL,
  LEVEL_LABEL,
  daysLeft,
  formatDate,
  formatSalary,
  timeAgo,
} from '../../lib/format';
import type { JobCard as Job, JobDetail } from '../../lib/types';
import { useSeo } from '../../lib/seo';
import ApplyModal from './ApplyModal';
import { useQuickApply } from '../../lib/quickApply';
import ResponseBadge from '../../components/ResponseBadge';
import { DetailSkeleton } from '../../components/Skeleton';

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <RichText value={text} className="leading-relaxed text-slate-700" />
    </section>
  );
}

/** Dữ liệu có cấu trúc schema.org/JobPosting (Google for Jobs) */
function jobPostingLd(job: JobDetail) {
  const EMPLOYMENT: Record<string, string> = { FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME', INTERNSHIP: 'INTERN', CONTRACT: 'CONTRACTOR', REMOTE: 'FULL_TIME' };
  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.requirements, job.benefits].filter(Boolean).map((t) => plainToHtml(t)).join(''),
    datePosted: job.publishedAt ?? undefined,
    validThrough: `${job.deadline}T23:59:59+07:00`,
    employmentType: EMPLOYMENT[job.jobType] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company.name,
      sameAs: job.company.website ?? undefined,
      logo: job.company.logoUrl ? new URL(job.company.logoUrl, window.location.origin).href : undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', streetAddress: job.workAddress ?? undefined, addressRegion: job.location?.name, addressCountry: 'VN' },
    },
    ...(job.jobType === 'REMOTE' && { jobLocationType: 'TELECOMMUTE' }),
    ...(!job.salaryNegotiable && (job.salaryMin || job.salaryMax)
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'VND',
            value: { '@type': 'QuantitativeValue', minValue: job.salaryMin ?? undefined, maxValue: job.salaryMax ?? undefined, unitText: 'MONTH' },
          },
        }
      : {}),
  };
}

export default function JobDetailPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [applyOpen, setApplyOpen] = useState(false);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', slug, user?.id],
    queryFn: async () => (await api.get<JobDetail>(`/jobs/${slug}`)).data,
  });
  const quick = useQuickApply(job?.id ?? 0, slug);
  const { data: similar } = useQuery({
    queryKey: ['job', slug, 'similar'],
    queryFn: async () => (await api.get<Job[]>(`/jobs/${slug}/similar`)).data,
    enabled: !!job,
  });

  useSeo(
    job
      ? {
          title: `${job.title} – ${job.company.name}`,
          description: `${job.company.name} tuyển ${job.title}${job.location ? ` tại ${job.location.name}` : ''}. Lương ${formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}. ${stripHtml(job.description)}`,
          image: job.company.logoUrl,
          jsonLd: jobPostingLd(job),
        }
      : { title: 'Việc làm' },
  );

  if (isLoading) return <DetailSkeleton />;
  if (error || !job)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-slate-600">{errorMessage(error, 'Không tìm thấy tin tuyển dụng')}</p>
        <Link to="/jobs" className="mt-4 inline-block text-brand-600 hover:underline">
          ← Xem việc làm khác
        </Link>
      </div>
    );

  function onQuickApply() {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    quick.mutate(undefined, {
      onSuccess: (r) =>
        toast(r.generated ? 'Đã tạo CV từ hồ sơ và nộp hồ sơ thành công!' : `Đã nộp hồ sơ bằng CV "${r.resumeName}"`),
    });
  }

  function onApplyClick() {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    setApplyOpen(true);
  }

  const status = job.myApplication ? APPLICATION_STATUS[job.myApplication.status] : null;
  const applyArea =
    user && user.role !== 'CANDIDATE' ? (
      <p className="text-sm text-slate-500">Chỉ tài khoản ứng viên mới ứng tuyển được.</p>
    ) : job.myApplication && job.myApplication.status !== 'WITHDRAWN' ? (
      <div className="text-sm">
        <p>
          Bạn đã ứng tuyển ngày {formatDate(job.myApplication.createdAt)} —{' '}
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${status?.cls}`}>{status?.label}</span>
        </p>
        <Link to="/candidate/applications" className="text-brand-600 hover:underline">
          Quản lý đơn ứng tuyển
        </Link>
      </div>
    ) : job.myApplication ? (
      <p className="text-sm text-slate-500">Bạn đã rút đơn ứng tuyển vị trí này.</p>
    ) : (
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <div className="flex flex-wrap gap-2">
          <Button onClick={onQuickApply} loading={quick.isPending} className="w-full sm:w-auto" title="Nộp ngay bằng CV mặc định, không cần điền gì thêm">
            ⚡ Ứng tuyển 1 chạm
          </Button>
          <Button variant="outline" onClick={onApplyClick} disabled={quick.isPending} className="w-full sm:w-auto">
            Chọn CV / viết thư giới thiệu
          </Button>
        </div>
        {quick.isError && (
          <Alert type="error">
            {errorMessage(quick.error)}{' '}
            <Link to="/candidate/cv-builder" className="font-medium underline">Tạo CV online</Link>
          </Alert>
        )}
      </div>
    );

  const info: [string, string][] = [
    ['Mức lương', formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)],
    ['Địa điểm', job.location?.name ?? '—'],
    ['Kinh nghiệm', job.experienceYears ? `${job.experienceYears} năm` : 'Không yêu cầu'],
    ['Cấp bậc', LEVEL_LABEL[job.level]],
    ['Hình thức', JOB_TYPE_LABEL[job.jobType]],
    ['Số lượng', `${job.quantity} người`],
    ['Hạn nộp', `${formatDate(job.deadline)} (còn ${daysLeft(job.deadline)} ngày)`],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Đăng {timeAgo(job.publishedAt)} · {job.viewCount} lượt xem
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {applyArea}
              <SaveJobButton jobId={job.id} withLabel />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <Link key={s.id} to={`/jobs?q=${encodeURIComponent(s.name)}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-brand-50">
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
            <Section title="Mô tả công việc" text={job.description} />
            <Section title="Yêu cầu ứng viên" text={job.requirements} />
            <Section title="Quyền lợi" text={job.benefits} />
            <Section title="Địa điểm làm việc" text={job.workAddress} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <CompanyLogo name={job.company.name} url={job.company.logoUrl} size={56} />
              <Link to={`/companies/${job.company.slug}`} className="font-semibold hover:text-brand-600">
                {job.company.name}
                {job.company.verified && <span className="ml-1 text-brand-600">✔</span>}
              </Link>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {job.company.size && (
                <div>
                  <dt className="inline text-slate-500">Quy mô: </dt>
                  <dd className="inline">{COMPANY_SIZE_LABEL[job.company.size] ?? job.company.size}</dd>
                </div>
              )}
              {job.company.address && (
                <div>
                  <dt className="inline text-slate-500">Địa chỉ: </dt>
                  <dd className="inline">
                    {job.company.address}
                    {job.company.location ? `, ${job.company.location}` : ''}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3">
              <ResponseBadge info={job.company.response} />
            </div>
            <Link to={`/companies/${job.company.slug}`} className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Xem trang công ty →
            </Link>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Cẩn trọng khi ứng tuyển</p>
            <p className="mt-1">Không nộp phí hay đặt cọc dưới bất kỳ hình thức nào. Nếu thấy dấu hiệu lừa đảo, hãy báo cáo cho chúng tôi.</p>
            <div className="mt-2">
              <ReportButton targetType="JOB" targetId={job.id} label={job.title} />
            </div>
          </div>
        </aside>
      </div>

      {similar && similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Việc làm tương tự</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {similar.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </section>
      )}

      {user?.role === 'CANDIDATE' && (
        <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} jobId={job.id} jobTitle={job.title} slug={slug} />
      )}
    </div>
  );
}
