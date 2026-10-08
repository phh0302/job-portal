import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { api } from './api';

const IDS_KEY = ['candidate', 'saved-ids'];

/** Tập id việc làm đã lưu của ứng viên (dùng để tô trái tim) */
export function useSavedJobIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: IDS_KEY,
    queryFn: async () => new Set((await api.get<number[]>('/candidate/saved-jobs/ids')).data),
    enabled: user?.role === 'CANDIDATE',
    staleTime: 5 * 60_000,
  });
}

export function useToggleSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, save }: { jobId: number; save: boolean }) =>
      save ? api.put(`/candidate/saved-jobs/${jobId}`) : api.delete(`/candidate/saved-jobs/${jobId}`),
    // Cập nhật ngay trên giao diện, lỗi thì hoàn tác
    onMutate: async ({ jobId, save }) => {
      await qc.cancelQueries({ queryKey: IDS_KEY });
      const prev = qc.getQueryData<Set<number>>(IDS_KEY);
      const next = new Set(prev);
      if (save) next.add(jobId);
      else next.delete(jobId);
      qc.setQueryData(IDS_KEY, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(IDS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['candidate', 'saved-jobs'] }),
  });
}
