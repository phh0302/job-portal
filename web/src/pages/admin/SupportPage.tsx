import { useEffect, useRef, useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { SUPPORT_STATUS, type SupportMessage, type SupportStatus, type SupportTicket } from '../../lib/support';
import type { Paginated } from '../../lib/types';
import { Empty, Tabs } from './shared';

interface TicketUser {
  id: number;
  email: string;
  role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
  status: string;
  name: string | null;
  company: { id: number; name: string; slug: string } | null;
}
type Row = SupportTicket & { unreadForAdmin: boolean; user: TicketUser };
interface Detail {
  ticket: SupportTicket;
  user: TicketUser;
  messages: SupportMessage[];
}
interface FaqRow {
  id: number;
  question: string;
  answer: string;
  keywords: string | null;
  audience: 'ALL' | 'CANDIDATE' | 'EMPLOYER';
  isActive: boolean;
  sortOrder: number;
}

const ROLE: Record<string, string> = { CANDIDATE: 'Ứng viên', EMPLOYER: 'Nhà tuyển dụng', ADMIN: 'Admin' };
const AUDIENCE: Record<FaqRow['audience'], string> = { ALL: 'Mọi người', CANDIDATE: 'Ứng viên', EMPLOYER: 'Nhà tuyển dụng' };
const CANNED = [
  'Chào bạn, mình là nhân viên hỗ trợ của JobPortal. Mình đang kiểm tra yêu cầu của bạn, bạn chờ mình một chút nhé.',
  'Bạn vui lòng gửi giúp mình mã đơn hàng (bắt đầu bằng JP…) để mình kiểm tra thanh toán.',
  'Mình đã xử lý xong. Bạn tải lại trang để xem kết quả nhé. Còn cần hỗ trợ gì thêm không ạ?',
  'Cảm ơn bạn đã liên hệ. Nếu cần thêm, bạn cứ nhắn lại bất cứ lúc nào nhé!',
];
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600';

function Thread({ id }: { id: number }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const key = ['admin', 'support', 'ticket', id];
  const { data, isLoading, isError, error } = useQuery({ queryKey: key, queryFn: async () => (await api.get<Detail>(`/admin/support/tickets/${id}`)).data });
  const done = (d: Detail) => {
    qc.setQueryData(key, d);
    qc.invalidateQueries({ queryKey: ['admin', 'support', 'list'] });
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };
  const reply = useMutation({
    mutationFn: async (body: string) => (await api.post<Detail>(`/admin/support/tickets/${id}/messages`, { body })).data,
    onSuccess: (d) => {
      setText('');
      done(d);
    },
  });
  const close = useMutation({ mutationFn: async () => (await api.post<Detail>(`/admin/support/tickets/${id}/close`)).data, onSuccess: done });

  const last = data?.messages.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
    // Mở cuộc hỗ trợ = đã đọc → cập nhật danh sách & badge
    if (last) {
      qc.invalidateQueries({ queryKey: ['admin', 'support', 'list'] });
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  }, [last, qc]);

  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError || !data) return <Alert type="error">{errorMessage(error)}</Alert>;
  const { ticket: t, user: u } = data;
  const closed = t.status === 'CLOSED';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) reply.mutate(text.trim());
  };

  return (
    <section className="flex h-[75vh] min-h-[460px] flex-col rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {u.name ?? u.email} <span className="text-xs font-normal text-slate-500">· {ROLE[u.role]}</span>
            {u.status === 'LOCKED' && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">Đang bị khoá</span>}
          </p>
          <p className="truncate text-xs text-slate-500">
            {u.email}
            {u.company && (
              <>
                {' · '}
                <Link to={`/companies/${u.company.slug}`} target="_blank" className="hover:text-brand-600">{u.company.name}</Link>
              </>
            )}
            {' · '}
            <Link to={`/admin/users?q=${encodeURIComponent(u.email)}`} className="text-brand-600 hover:underline">Xem tài khoản</Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${SUPPORT_STATUS[t.status].cls}`}>{SUPPORT_STATUS[t.status].label}</span>
          {!closed && (
            <button onClick={() => window.confirm('Đóng cuộc hỗ trợ này?') && close.mutate()} className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
              Đóng
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {data.messages.map((m) =>
          m.senderType === 'SYSTEM' ? (
            <p key={m.id} className="mx-auto max-w-[85%] rounded bg-slate-100 px-3 py-1.5 text-center text-xs text-slate-600">{m.body}</p>
          ) : (
            <div key={m.id} className={`flex ${m.senderType === 'USER' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.senderType === 'USER' ? 'bg-slate-100' : m.senderType === 'ADMIN' ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}>
                <p className="mb-0.5 text-[11px] font-semibold opacity-70">{m.senderType === 'USER' ? 'Khách hàng' : m.senderType === 'ADMIN' ? 'Nhân viên' : '🤖 Trợ lý tự động'}</p>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className="mt-0.5 text-right text-[10px] opacity-60">{new Date(m.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <p className="border-t border-slate-100 p-3 text-center text-sm text-slate-500">Cuộc hỗ trợ đã đóng.</p>
      ) : (
        <form onSubmit={submit} className="space-y-2 border-t border-slate-100 p-3">
          {(reply.isError || close.isError) && <Alert type="error">{errorMessage(reply.error ?? close.error)}</Alert>}
          <div className="flex flex-wrap gap-1.5">
            {CANNED.map((c) => (
              <button key={c} type="button" onClick={() => setText(c)} className="max-w-[240px] truncate rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50" title={c}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Trả lời khách hàng…" className={`${input} flex-1 resize-none`} />
            <Button type="submit" loading={reply.isPending} disabled={!text.trim()}>Gửi</Button>
          </div>
        </form>
      )}
    </section>
  );
}

function Tickets() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<SupportStatus | ''>('');
  const [page, setPage] = useState(1);
  const activeId = params.get('id') ? Number(params.get('id')) : null;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'support', 'list', status, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/admin/support/tickets', { params: { status: status || undefined, page, limit: 20 } })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const select = (id: number) => setParams({ id: String(id) });

  return (
    <div className="space-y-3">
      <Tabs
        tabs={[
          { value: '', label: 'Đang mở' },
          { value: 'WAITING', label: 'Chờ nhân viên' },
          { value: 'OPEN', label: 'Đang hỗ trợ' },
          { value: 'BOT', label: 'Chỉ trợ lý' },
          { value: 'CLOSED', label: 'Đã đóng' },
        ]}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2">
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : isError ? (
            <Alert type="error">{errorMessage(error)}</Alert>
          ) : !data?.items.length ? (
            <Empty>Không có cuộc hỗ trợ nào.</Empty>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {data.items.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => select(r.id)} className={`w-full p-3 text-left ${activeId === r.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${r.unreadForAdmin ? 'font-bold' : 'font-medium'}`}>{r.user.name ?? r.user.email}</p>
                        <span className="shrink-0 text-xs text-slate-400">{timeAgo(r.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-xs text-slate-500">{ROLE[r.user.role]}{r.user.company ? ` · ${r.user.company.name}` : ''}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${SUPPORT_STATUS[r.status].cls}`}>{SUPPORT_STATUS[r.status].label}</span>
                        <p className="truncate text-xs text-slate-600">{r.subject}</p>
                        {r.unreadForAdmin && <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-label="Chưa đọc" />}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </div>
        <div>
          {activeId ? (
            <Thread key={activeId} id={activeId} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
              Chọn một cuộc hỗ trợ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FaqEditor({ faq, onClose }: { faq: FaqRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
    keywords: faq?.keywords ?? '',
    audience: faq?.audience ?? ('ALL' as FaqRow['audience']),
    isActive: faq?.isActive ?? true,
    sortOrder: faq?.sortOrder ?? 0,
  });
  const save = useMutation({
    mutationFn: async () => (faq ? api.put(`/admin/support/faqs/${faq.id}`, f) : api.post('/admin/support/faqs', f)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'support', 'faqs'] });
      qc.invalidateQueries({ queryKey: ['support', 'faqs'] });
      onClose();
    },
    meta: { successMessage: 'Đã lưu câu hỏi' },
  });
  return (
    <Modal open onClose={onClose} title={faq ? 'Sửa câu hỏi thường gặp' : 'Thêm câu hỏi thường gặp'}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3 text-sm">
        {save.isError && <Alert type="error">{errorMessage(save.error)}</Alert>}
        <label className="block">
          <span className="mb-1 block font-medium">Câu hỏi</span>
          <input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} maxLength={300} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Câu trả lời</span>
          <textarea value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} rows={6} maxLength={4000} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Từ khoá (cách nhau dấu phẩy – giúp trợ lý tìm đúng)</span>
          <input value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} maxLength={500} className={input} placeholder="quên mật khẩu, đặt lại mật khẩu" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-medium">Dành cho</span>
            <select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value as FaqRow['audience'] })} className={input}>
              {Object.entries(AUDIENCE).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Thứ tự</span>
            <input type="number" min={0} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} className={input} />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
          Đang dùng
        </label>
        <Button type="submit" loading={save.isPending}>Lưu</Button>
      </form>
    </Modal>
  );
}

function Faqs() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FaqRow | null | 'new'>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'support', 'faqs'], queryFn: async () => (await api.get<FaqRow[]>('/admin/support/faqs')).data });
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/support/faqs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'support', 'faqs'] }),
    meta: { successMessage: 'Đã xoá' },
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Trợ lý tự động chỉ trả lời dựa trên các câu hỏi này. Viết rõ ràng, cập nhật khi chính sách thay đổi.</p>
        <Button onClick={() => setEditing('new')}>+ Thêm câu hỏi</Button>
      </div>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data?.map((f) => (
            <li key={f.id} className={`flex items-start gap-3 p-3 ${f.isActive ? '' : 'opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.question}</p>
                <p className="line-clamp-2 text-sm text-slate-600">{f.answer}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {AUDIENCE[f.audience]}
                  {!f.isActive && ' · Đang tắt'}
                  {f.keywords ? ` · ${f.keywords}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button onClick={() => setEditing(f)} className="text-brand-600 hover:underline">Sửa</button>
                <button onClick={() => window.confirm('Xoá câu hỏi này?') && remove.mutate(f.id)} className="text-red-600 hover:underline">Xoá</button>
              </div>
            </li>
          ))}
          {data && !data.length && <li className="p-6 text-center text-sm text-slate-500">Chưa có câu hỏi nào.</li>}
        </ul>
      )}
      {editing && <FaqEditor faq={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function AdminSupportPage() {
  const [tab, setTab] = useState<'tickets' | 'faqs'>('tickets');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hỗ trợ khách hàng</h1>
      <div className="flex gap-2">
        {(['tickets', 'faqs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-brand-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}
          >
            {t === 'tickets' ? 'Cuộc hỗ trợ' : 'Câu hỏi thường gặp (trợ lý)'}
          </button>
        ))}
      </div>
      {tab === 'tickets' ? <Tickets /> : <Faqs />}
    </div>
  );
}
