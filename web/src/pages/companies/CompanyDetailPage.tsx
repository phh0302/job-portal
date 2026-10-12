import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import ReportButton from '../../components/ReportButton';
import { toast } from '../../components/Toast';
import CompanyLogo from '../../components/CompanyLogo';
import JobCard from '../../components/JobCard';
import { api, errorMessage } from '../../lib/api';
import { COMPANY_SIZE_LABEL } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import type { CompanyCard, JobCard as Job, Paginated } from '../../lib/types';
import { DetailSkeleton } from '../../components/Skeleton';
import CompanyReviews from '../../components/reviews/CompanyReviews';
import { Stars } from '../../components/reviews/Stars';
import ResponseBadge from '../../components/ResponseBadge';

interface CompanyDetail extends CompanyCard {
  coverUrl: string | null;
  size: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  rating: { average: number; count: number };
}

type FollowState = { following: boolean; followers: number };

function FollowButton({ companyId }: { companyId: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const key = ['company-follow', companyId, user?.id];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<FollowState>(`/companies/${companyId}/followers`)).data,
  });
  const toggle = useMutation({
    mutationFn: async (follow: boolean) => {
      const url = `/candidate/followed-companies/${companyId}`;
      const res = follow ? await api.put<FollowState>(url) : await api.delete<FollowState>(url);
      return res.data;
    },
    onSuccess: (d) => {
      qc.setQueryData(key, d);
      qc.invalidateQueries({ queryKey: ['candidate', 'followed-companies'] });
      toast(d.following ? 'Đã theo dõi công ty' : 'Đã bỏ theo dõi');
    },
  });

  const canFollow = !user || user.role === 'CANDIDATE';
  return (
    <div className="flex items-center gap-3">
      {canFollow && (
        <button
          disabled={toggle.isPending}
          onClick={() => (user ? toggle.mutate(!data?.following) : navigate('/login', { state: { from: location.pathname } }))}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            data?.following ? 'border border-slate-300 text-slate-600 hover:bg-slate-50' : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {data?.following ? '✓ Đang theo dõi' : '+ Theo dõi'}
        </button>
      )}
      <span className="text-sm text-slate-500">{data?.followers ?? 0} người theo dõi</span>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { slug = '' } = useParams();
  const { data: c, isLoading, error } = useQuery({
    queryKey: ['company', slug],
    queryFn: async () => (await api.get<CompanyDetail>(`/companies/${slug}`)).data,
  });
  const { data: jobs } = useQuery({
    queryKey: ['company', slug, 'jobs'],
    queryFn: async () => (await api.get<Paginated<Job>>('/jobs', { params: { companyId: c!.id, limit: 50 } })).data,
    enabled: !!c,
  });

  useSeo({
    title: c ? `${c.name} tuyển dụng` : 'Công ty',
    description: c ? `${c.name}${c.location ? ` – ${c.location}` : ''}. ${c.description ?? 'Xem thông tin công ty và các vị trí đang tuyển dụng.'}` : undefined,
    image: c?.logoUrl,
  });

  if (isLoading) return <DetailSkeleton />;
  if (error || !c)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-slate-600">{errorMessage(error, 'Không tìm thấy công ty')}</p>
        <Link to="/companies" className="mt-4 inline-block text-brand-600 hover:underline">← Danh sách công ty</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-32 bg-gradient-to-r from-brand-600 to-blue-400 sm:h-44" style={c.coverUrl ? { backgroundImage: `url(${c.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="-mt-14 rounded-xl bg-white p-1 shadow">
            <CompanyLogo name={c.name} url={c.logoUrl} size={88} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">
              {c.name}
              {c.verified && <span title="Đã xác minh" className="ml-2 text-base text-brand-600">✔ Đã xác minh</span>}
            </h1>
            <p className="text-sm text-slate-500">
              {[c.size && (COMPANY_SIZE_LABEL[c.size] ?? c.size), c.address && `${c.address}${c.location ? `, ${c.location}` : ''}`].filter(Boolean).join(' · ')}
            </p>
            {c.rating.count > 0 && (
              <a href="#reviews" className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600">
                <Stars value={c.rating.average} size="text-sm" /> {c.rating.average.toFixed(1)} ({c.rating.count} đánh giá)
              </a>
            )}
            {c.response && (
              <div className="mt-2 max-w-md">
                <ResponseBadge info={c.response} compact />
              </div>
            )}
            <div className="mt-3">
              <FollowButton companyId={c.id} />
            </div>
            {c.website && (
              <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-brand-600 hover:underline">
                {c.website}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold">Giới thiệu công ty</h2>
          <p className="whitespace-pre-line text-slate-700">{c.description || 'Chưa có thông tin giới thiệu.'}</p>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <ReportButton targetType="COMPANY" targetId={c.id} label={c.name} />
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Đang tuyển ({jobs?.total ?? 0})</h2>
          <div className="space-y-3">
            {jobs?.items.map((j) => <JobCard key={j.id} job={j} />)}
            {jobs && jobs.items.length === 0 && <p className="text-slate-500">Hiện chưa có vị trí đang tuyển.</p>}
          </div>
        </section>
      </div>
      <CompanyReviews companyId={c.id} slug={c.slug} companyName={c.name} />
    </div>
  );
}
