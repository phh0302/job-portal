import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { api, errorMessage } from '../../lib/api';
import { SUPPORT_KEY, SUPPORT_STATUS, type Faq, type SupportConversation, type SupportMessage } from '../../lib/support';

const MAX = 2000;

function time(v: string) {
  return new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function Bubble({ m }: { m: SupportMessage }) {
  if (m.senderType === 'SYSTEM') {
    return <p className="mx-auto max-w-[90%] rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-600">{m.body}</p>;
  }
  const mine = m.senderType === 'USER';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : m.senderType === 'ADMIN' ? 'bg-blue-50 text-slate-800 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-800'}`}>
        {!mine && <p className="mb-0.5 text-[11px] font-semibold opacity-70">{m.senderType === 'ADMIN' ? '👩‍💼 Nhân viên hỗ trợ' : '🤖 Trợ lý tự động'}</p>}
        <p className="whitespace-pre-line break-words">{m.body}</p>
        <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{time(m.createdAt)}</p>
      </div>
    </div>
  );
}

/** Khách chưa đăng nhập: chỉ tra cứu câu hỏi thường gặp */
function GuestFaq() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const location = useLocation();
  const { data } = useQuery({
    queryKey: ['support', 'faqs', 'guest', q],
    queryFn: async () => (await api.get<Faq[]>('/support/faqs', { params: { q: q || undefined } })).data,
  });
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm câu hỏi… (vd: quên mật khẩu)" aria-label="Tìm câu hỏi thường gặp" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-3">
        {data?.map((f) => (
          <li key={f.id} className="rounded-lg border border-slate-200">
            <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full px-3 py-2 text-left text-sm font-medium" aria-expanded={open === f.id}>
              {f.question}
            </button>
            {open === f.id && <p className="whitespace-pre-line px-3 pb-3 text-sm text-slate-600">{f.answer}</p>}
          </li>
        ))}
        {data && !data.length && <li className="p-3 text-sm text-slate-500">Không tìm thấy câu hỏi phù hợp.</li>}
      </ul>
      <p className="border-t border-slate-100 p-3 text-center text-sm">
        <Link to="/login" state={{ from: location.pathname }} className="font-medium text-brand-600 hover:underline">Đăng nhập</Link> để chat với trợ lý & nhân viên hỗ trợ
      </p>
    </div>
  );
}

/** Ứng viên / NTD: chat với trợ lý tự động, có thể chuyển nhân viên */
function Chat({ role }: { role: 'CANDIDATE' | 'EMPLOYER' }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...SUPPORT_KEY, 'conversation'],
    queryFn: async () => (await api.get<SupportConversation>('/support/conversation')).data,
  });
  const { data: faqs } = useQuery({
    queryKey: ['support', 'faqs', role],
    queryFn: async () => (await api.get<Faq[]>('/support/faqs', { params: { audience: role } })).data,
    enabled: !!data && !data.ticket,
  });

  const setConv = (d: SupportConversation) => {
    qc.setQueryData([...SUPPORT_KEY, 'conversation'], d);
    qc.invalidateQueries({ queryKey: [...SUPPORT_KEY, 'unread'] });
  };
  const send = useMutation({
    mutationFn: async (body: string) => (await api.post<SupportConversation>('/support/messages', { body })).data,
    onSuccess: (d) => {
      setText('');
      setConv(d);
    },
  });
  const escalate = useMutation({ mutationFn: async () => (await api.post<SupportConversation>('/support/escalate')).data, onSuccess: setConv });
  const close = useMutation({
    mutationFn: async () => api.post('/support/close'),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_KEY }),
  });

  const last = data?.messages.at(-1)?.id;
  useEffect(() => bottomRef.current?.scrollIntoView({ block: 'end' }), [last, send.isPending]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (body && !send.isPending) send.mutate(body);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  if (isError) {
    return (
      <div className="space-y-2 p-4 text-sm">
        <p className="text-red-600">Không mở được khung hỗ trợ: {errorMessage(error)}</p>
        <button onClick={() => refetch()} className="font-medium text-brand-600 hover:underline">Thử lại</button>
      </div>
    );
  }
  if (isLoading || !data) return <p className="p-4 text-sm text-slate-500">Đang tải…</p>;
  const t = data.ticket;
  const err = send.error ?? escalate.error ?? close.error;

  return (
    <div className="flex h-full flex-col">
      {t && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5 text-xs">
          <span className={`rounded px-2 py-0.5 font-medium ${SUPPORT_STATUS[t.status].cls}`}>{SUPPORT_STATUS[t.status].label}</span>
          <div className="flex gap-3">
            {t.status === 'BOT' && (
              <button onClick={() => escalate.mutate()} disabled={escalate.isPending} className="font-medium text-brand-600 hover:underline">
                👩‍💼 Gặp nhân viên
              </button>
            )}
            <button onClick={() => window.confirm('Kết thúc cuộc hỗ trợ này?') && close.mutate()} className="text-slate-500 hover:underline">
              Kết thúc
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {!t && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-sm">
              <p className="mb-0.5 text-[11px] font-semibold opacity-70">🤖 Trợ lý tự động</p>
              Xin chào! Mình có thể giúp gì cho bạn? Bạn có thể chọn câu hỏi bên dưới hoặc nhập câu hỏi của mình. Cần người thật, bạn cứ nói "gặp nhân viên" nhé.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {faqs?.slice(0, 5).map((f) => (
                <button key={f.id} onClick={() => send.mutate(f.question)} disabled={send.isPending} className="rounded-full border border-brand-600/40 px-3 py-1 text-left text-xs text-brand-700 hover:bg-brand-50">
                  {f.question}
                </button>
              ))}
            </div>
          </div>
        )}
        {data.messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {send.isPending && (
          <p className="text-xs text-slate-400">{t?.status === 'BOT' || !t ? 'Trợ lý đang trả lời…' : 'Đang gửi…'}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {err && <p className="px-3 pb-1 text-xs text-red-600">{errorMessage(err)}</p>}
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-100 p-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          maxLength={MAX}
          placeholder="Nhập câu hỏi…"
          aria-label="Nội dung tin nhắn hỗ trợ"
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
        />
        <button type="submit" disabled={!text.trim() || send.isPending} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          Gửi
        </button>
      </form>
      <p className="px-3 pb-2 text-[10px] text-slate-400">
        {data.aiEnabled ? 'Trợ lý dùng AI, có thể sai sót. ' : ''}Không gửi mật khẩu, mã OTP hay số thẻ ngân hàng.
      </p>
    </div>
  );
}

/** Nút hỗ trợ nổi ở góc phải (ẩn với admin) */
export default function SupportWidget() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const isMember = user?.role === 'CANDIDATE' || user?.role === 'EMPLOYER';

  const { data: unread } = useQuery({
    queryKey: [...SUPPORT_KEY, 'unread'],
    queryFn: async () => (await api.get<{ unread: boolean }>('/support/unread')).data.unread,
    enabled: isMember && !open,
    refetchInterval: 120_000,
  });

  // Mở từ thông báo: /?support=open
  useEffect(() => {
    if (params.get('support') === 'open') {
      setOpen(true);
      const next = new URLSearchParams(params);
      next.delete('support');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  if (user?.role === 'ADMIN') return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <section
          role="dialog"
          aria-label="Hỗ trợ khách hàng"
          className="flex h-[min(560px,calc(100vh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Hỗ trợ khách hàng</p>
              <p className="text-xs text-white/80">Trợ lý trả lời ngay · Nhân viên 8:00–17:30</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Đóng hỗ trợ" className="text-2xl leading-none text-white/80 hover:text-white">×</button>
          </header>
          <div className="min-h-0 flex-1">{isMember ? <Chat role={user!.role as 'CANDIDATE' | 'EMPLOYER'} /> : <GuestFaq />}</div>
        </section>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Đóng hỗ trợ' : 'Mở hỗ trợ khách hàng'}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg hover:bg-brand-700"
      >
        {open ? '×' : '💬'}
        {!open && unread && <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" aria-label="Có tin nhắn hỗ trợ mới" />}
      </button>
    </div>
  );
}
