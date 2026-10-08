import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button } from '../ui';
import { toast } from '../Toast';
import { api, errorMessage } from '../../lib/api';
import { RELATION_LABEL, type MyReview, type ReviewRelation } from '../../lib/reviews';
import { StarInput } from './Stars';

const area = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600';

/** Form viết / sửa đánh giá công ty. Gửi xong → chờ admin duyệt. */
export default function ReviewForm({ companyId, initial, onDone }: { companyId: number; initial?: MyReview | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [pros, setPros] = useState(initial?.pros ?? '');
  const [cons, setCons] = useState(initial?.cons ?? '');
  const [relation, setRelation] = useState<ReviewRelation | ''>(initial?.relation ?? '');
  const [isAnonymous, setAnonymous] = useState(initial?.isAnonymous ?? true);
  const [localError, setLocalError] = useState('');

  const save = useMutation({
    mutationFn: async () =>
      (await api.put<MyReview>(`/candidate/reviews/company/${companyId}`, { rating, title, pros, cons, relation, isAnonymous })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      toast('Đã gửi đánh giá – đánh giá sẽ hiển thị sau khi được duyệt');
      onDone();
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return setLocalError('Vui lòng chọn số sao');
    if (!relation) return setLocalError('Vui lòng chọn mối quan hệ với công ty');
    if (!title.trim()) return setLocalError('Vui lòng nhập tiêu đề');
    if (pros.trim().length < 20 || cons.trim().length < 20) return setLocalError('Điểm tốt và điểm chưa tốt cần tối thiểu 20 ký tự');
    setLocalError('');
    save.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {(localError || save.isError) && <Alert type="error">{localError || errorMessage(save.error)}</Alert>}
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Đánh giá chung *</span>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Bạn là *</span>
        <select value={relation} onChange={(e) => setRelation(e.target.value as ReviewRelation)} className={area}>
          <option value="">-- Chọn --</option>
          {Object.entries(RELATION_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Tiêu đề *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className={area} placeholder="Tóm tắt trải nghiệm của bạn" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Điểm tốt *</span>
        <textarea value={pros} onChange={(e) => setPros(e.target.value)} rows={4} maxLength={2000} className={area} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Điểm chưa tốt *</span>
        <textarea value={cons} onChange={(e) => setCons(e.target.value)} rows={4} maxLength={2000} className={area} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isAnonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        Ẩn tên của tôi khi hiển thị công khai
      </label>
      <p className="text-xs text-slate-500">
        Đánh giá cần trung thực, không xúc phạm, không tiết lộ thông tin cá nhân hay bí mật kinh doanh. Quản trị viên sẽ duyệt trước khi đăng.
      </p>
      <Button type="submit" loading={save.isPending}>{initial ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</Button>
    </form>
  );
}
