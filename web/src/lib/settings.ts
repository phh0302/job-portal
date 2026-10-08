import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface PublicSettings {
  homeBannerTitle: string;
  homeBannerSubtitle: string;
  siteNotice: string;
  maxResumeMb: number;
  maxResumes: number;
  jobMaxDays: number;
  jobDefaultDays: number;
}

export const usePublicSettings = () =>
  useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get<PublicSettings>('/settings/public')).data,
    staleTime: 5 * 60_000,
  });
