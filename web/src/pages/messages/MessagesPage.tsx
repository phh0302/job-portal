import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Pagination from '../../components/Pagination';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { APPLICATION_STATUS, timeAgo } from '../../lib/format';
import { MESSAGE_MAX, messagesKey, type ChatMessage, type ChatSide, type ChatThread, type Conversation } from '../../lib/messages';
import type { Paginated } from '../../lib/types';

function timeText(v: string) {
  return new Date(v).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

/** Tên/ảnh hiển thị cho "phía bên kia" */
function counterpart(side: ChatSide, c: Pick<Conversation, 'company' | 'candidate'>) {
  return side === 'employer' ? { name: c.candidate.fullName, url: c.candidate.avatarUrl } : { name: c.company.name, url: c.company.logoUrl };
}

function ConversationList({ side, activeId }: { side: ChatSide; activeId: number | null }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: messagesKey(side, 'list', page),
    queryFn: async () => (await api.get<Paginated<Conversation>>(`/${side}/messages`, { params: { page, limit: 20 } })).data,
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError) return <Alert type="error">{errorMessage(error)}</Alert>;
  if (!data?.items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {side === 'employer'
          ? 'Chưa có cuộc trò chuyện. Mở chi tiết một đơn ứng tuyển và bấm "Nhắn tin với ứng viên".'
          : 'Chưa có tin nhắn. Nhà tuyển dụng sẽ nhắn cho bạn qua đơn ứng tuyển.'}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {data.items.map((c) => {
          const who = counterpart(side, c);
          const active = c.applicationId === activeId;
          return (
            <li key={c.applicationId}>
              <Link
                to={`/${side}/messages/${c.applicationId}`}
                className={`flex gap-3 p-3 ${active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
              >
                <CompanyLogo name={who.name} url={who.url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${c.unread ? 'font-bold' : 'font-medium'}`}>{who.name}</p>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{c.job.title}</p>
                  {c.lastMessage && (
                    <p className={`truncate text-xs ${c.unread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                      {(side === 'employer') === (c.lastMessage.senderRole === 'EMPLOYER') ? 'Bạn: ' : ''}
                      {c.lastMessage.body}
                    </p>
                  )}
                </div>
                {c.unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Chưa đọc" />}
              </Link>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}

function Bubble({ m, side }: { m: ChatMessage; side: ChatSide }) {
  // Tin của "phía mình" (với NTD: cả đồng nghiệp) nằm bên phải
  const ours = (side === 'employer') === (m.senderRole === 'EMPLOYER');
  return (
    <div className={`flex ${ours ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${ours ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
        {side === 'employer' && m.senderRole === 'EMPLOYER' && !m.mine && <p className="mb-0.5 text-xs font-semibold opacity-80">{m.senderName}</p>}
        <p className="whitespace-pre-line break-words">{m.body}</p>
        <p className={`mt-1 text-right text-[11px] ${ours ? 'text-white/70' : 'text-slate-400'}`}>{timeText(m.createdAt)}</p>
      </div>
    </div>
  );
}

function Thread({ side, id }: { side: ChatSide; id: number }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const q = useInfiniteQuery({
    queryKey: messagesKey(side, 'thread', id),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await api.get<ChatThread>(`/${side}/messages/${id}`, { params: pageParam ? { before: pageParam } : {} })).data,
    getNextPageParam: (last) => (last.hasMore && last.messages.length ? last.messages[0].id : undefined),
  });

  const first = q.data?.pages[0];
  const messages = (q.data?.pages ?? []).slice().reverse().flatMap((p) => p.messages);
  const lastId = messages.at(-1)?.id;

  // Mở cuộc trò chuyện → server đánh dấu đã đọc → cập nhật badge / danh sách
  useEffect(() => {
    if (first) {
      void qc.invalidateQueries({ queryKey: messagesKey(side, 'unread') });
      void qc.invalidateQueries({ queryKey: messagesKey(side, 'list') });
    }
  }, [first, qc, side]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  const send = useMutation({
    mutationFn: async (body: string) => (await api.post<ChatMessage>(`/${side}/messages/${id}`, { body })).data,
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: ['messages', side] });
    },
  });

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

  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.isError) return <Alert type="error">{errorMessage(q.error)}</Alert>;
  if (!first) return null;

  const app = first.application;
  const who = counterpart(side, app);
  const st = APPLICATION_STATUS[app.status];

  return (
    <section className="flex h-[70vh] min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center gap-3 border-b border-slate-100 p-3">
        <Link to={`/${side}/messages`} className="text-sm text-brand-600 md:hidden" aria-label="Quay lại danh sách">←</Link>
        <CompanyLogo name={who.name} url={who.url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{who.name}</p>
          <p className="truncate text-xs text-slate-500">
            {side === 'employer' ? (
              <Link to={`/employer/applications/${app.id}`} className="hover:text-brand-600">Đơn: {app.job.title}</Link>
            ) : (
              <Link to={`/jobs/${app.job.slug}`} className="hover:text-brand-600">{app.job.title}</Link>
            )}
          </p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-medium ${st?.cls}`}>{st?.label ?? app.status}</span>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {q.hasNextPage && (
          <div className="text-center">
            <button onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} className="text-xs text-brand-600 hover:underline">
              {q.isFetchingNextPage ? 'Đang tải…' : 'Xem tin cũ hơn'}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            {side === 'employer' ? 'Gửi lời chào đầu tiên tới ứng viên.' : 'Chưa có tin nhắn.'}
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} side={side} />
        ))}
        <div ref={bottomRef} />
      </div>

      {first.canSend ? (
        <form onSubmit={submit} className="border-t border-slate-100 p-3">
          {send.isError && <div className="mb-2"><Alert type="error">{errorMessage(send.error)}</Alert></div>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              rows={2}
              maxLength={MESSAGE_MAX}
              placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
              aria-label="Nội dung tin nhắn"
              className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
            />
            <button
              type="submit"
              disabled={!text.trim() || send.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
          {text.length > MESSAGE_MAX - 200 && <p className="mt-1 text-right text-xs text-slate-500">{text.length}/{MESSAGE_MAX}</p>}
        </form>
      ) : (
        <p className="border-t border-slate-100 p-3 text-center text-sm text-slate-500">{first.hint}</p>
      )}
    </section>
  );
}

/** Hộp thư: danh sách bên trái, cuộc trò chuyện bên phải (mobile: 1 cột) */
export default function MessagesPage({ side }: { side: ChatSide }) {
  const { id } = useParams();
  const activeId = id ? Number(id) : null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tin nhắn</h1>
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <div className={activeId ? 'hidden md:block' : ''}>
          <ConversationList side={side} activeId={activeId} />
        </div>
        <div className={activeId ? '' : 'hidden md:block'}>
          {activeId ? (
            <Thread key={activeId} side={side} id={activeId} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
              Chọn một cuộc trò chuyện
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
