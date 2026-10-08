import { formatDate, formatSalary } from '../../lib/format';
import type { CandidateView } from './types';

/** Hiển thị hồ sơ ứng viên cho NTD (dùng ở chi tiết đơn & tìm hồ sơ) */
export default function CandidateProfileView({ c }: { c: CandidateView }) {
  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row">
        {c.avatarUrl ? (
          <img src={c.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-400">{c.fullName.charAt(0)}</span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{c.fullName}</h2>
          <p className="text-slate-600">{c.headline ?? 'Chưa có tiêu đề nghề nghiệp'}</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {c.email && <div><dt className="inline text-slate-500">Email: </dt><dd className="inline"><a href={`mailto:${c.email}`} className="text-brand-600">{c.email}</a></dd></div>}
            {c.phone && <div><dt className="inline text-slate-500">Điện thoại: </dt><dd className="inline">{c.phone}</dd></div>}
            {c.location && <div><dt className="inline text-slate-500">Nơi ở: </dt><dd className="inline">{c.location}</dd></div>}
            {c.dateOfBirth && <div><dt className="inline text-slate-500">Ngày sinh: </dt><dd className="inline">{formatDate(c.dateOfBirth)}</dd></div>}
            <div><dt className="inline text-slate-500">Kinh nghiệm: </dt><dd className="inline">{c.yearsOfExperience} năm</dd></div>
            {c.expectedSalary !== null && <div><dt className="inline text-slate-500">Lương mong muốn: </dt><dd className="inline">{formatSalary(c.expectedSalary, null, false).replace('Từ ', '')}</dd></div>}
          </dl>
        </div>
      </section>

      {c.summary && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 font-semibold">Giới thiệu</h3>
          <p className="whitespace-pre-line text-sm text-slate-700">{c.summary}</p>
        </section>
      )}

      {c.skills.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 font-semibold">Kỹ năng</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.skills.map((s) => <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{s.name}</span>)}
          </div>
        </section>
      )}

      {([
        ['Kinh nghiệm làm việc', c.experiences.map((e) => ({ id: e.id, t: e.position, s: e.companyName, a: e.startDate, b: e.endDate, d: e.description, now: 'Hiện tại' }))],
        ['Học vấn', c.educations.map((e) => ({ id: e.id, t: e.school, s: [e.major, e.degree].filter(Boolean).join(' · '), a: e.startDate, b: e.endDate, d: e.description, now: 'Đang học' }))],
      ] as const).map(([title, items]) =>
        items.length ? (
          <section key={title} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 font-semibold">{title}</h3>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="border-l-2 border-brand-600/30 pl-3">
                  <p className="font-medium">{i.t}</p>
                  {i.s && <p className="text-sm text-slate-600">{i.s}</p>}
                  <p className="text-xs text-slate-500">{i.a ? formatDate(i.a) : '?'} – {i.b ? formatDate(i.b) : i.now}</p>
                  {i.d && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{i.d}</p>}
                </div>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
