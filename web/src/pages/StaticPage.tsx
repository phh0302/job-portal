import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { useSeo } from '../lib/seo';

/** Hiển thị nội dung đơn giản: "## " tiêu đề phụ, "- " danh sách, dòng trống tách đoạn */
function SimpleText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className="space-y-4 leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {lines.map((l, j) => <li key={j}>{l.replace(/^\s*[-*]\s+/, '')}</li>)}
            </ul>
          );
        }
        if (b.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-slate-900">{b.slice(3)}</h2>;
        return <p key={i} className="whitespace-pre-line">{b}</p>;
      })}
    </div>
  );
}

export default function StaticPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['pages', slug],
    queryFn: async () => (await api.get<{ title: string; content: string; updatedAt: string }>(`/pages/${slug}`)).data,
  });
  useSeo({ title: data?.title, description: data?.content.slice(0, 160) });
  if (isLoading) return <p className="mx-auto max-w-3xl px-4 py-10 text-slate-500">Đang tải…</p>;
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">{errorMessage(error, 'Trang không tồn tại')}</p>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">← Trang chủ</Link>
      </div>
    );
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{data.title}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-400">Cập nhật {formatDate(data.updatedAt)}</p>
      <SimpleText text={data.content} />
    </article>
  );
}
