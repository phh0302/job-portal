import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../../lib/api';
import { useSkills } from '../../../lib/catalog';
import type { Option } from '../../../lib/types';
import { PROFILE_KEY, type CandidateProfile } from '../types';

export default function SkillsCard({ skills }: { skills: Option[] }) {
  const qc = useQueryClient();
  const { data: all } = useSkills();
  const [filter, setFilter] = useState('');

  const save = useMutation({
    mutationFn: async (ids: number[]) => (await api.put<Option[]>('/candidate/skills', { skillIds: ids })).data,
    onSuccess: (data) => qc.setQueryData<CandidateProfile>(PROFILE_KEY, (p) => (p ? { ...p, skills: data } : p)),
  });

  const selectedIds = new Set(skills.map((s) => s.id));
  const suggestions = useMemo(() => {
    const kw = filter.trim().toLowerCase();
    return (all ?? []).filter((s) => !selectedIds.has(s.id) && (!kw || s.name.toLowerCase().includes(kw))).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, skills]);

  const update = (ids: number[]) => save.mutate(ids);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Kỹ năng</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length === 0 && <p className="text-sm text-slate-500">Chưa có kỹ năng nào.</p>}
        {skills.map((s) => (
          <span key={s.id} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
            {s.name}
            <button
              aria-label={`Bỏ ${s.name}`}
              disabled={save.isPending}
              onClick={() => update(skills.filter((x) => x.id !== s.id).map((x) => x.id))}
              className="text-brand-700/60 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Tìm kỹ năng để thêm…"
        className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            disabled={save.isPending}
            onClick={() => update([...selectedIds, s.id])}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-brand-600 hover:text-brand-600"
          >
            + {s.name}
          </button>
        ))}
      </div>
      {save.isError && <p className="mt-2 text-sm text-red-600">{errorMessage(save.error)}</p>}
    </section>
  );
}
