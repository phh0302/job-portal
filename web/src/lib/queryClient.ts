import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from '../components/Toast';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Hiện toast khi thành công */
      successMessage?: string;
    };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _ctx, mutation) => {
      const msg = mutation.meta?.successMessage;
      if (msg) toast(msg, 'success');
    },
  }),
});
