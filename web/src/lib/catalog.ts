import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Option } from './types';

const forever = { staleTime: Infinity, gcTime: Infinity };

export const useCategories = () =>
  useQuery({ queryKey: ['catalog', 'categories'], queryFn: async () => (await api.get<(Option & { icon: string })[]>('/catalog/categories')).data, ...forever });

export const useLocations = () =>
  useQuery({ queryKey: ['catalog', 'locations'], queryFn: async () => (await api.get<Option[]>('/catalog/locations')).data, ...forever });

export const useSkills = () =>
  useQuery({ queryKey: ['catalog', 'skills'], queryFn: async () => (await api.get<Option[]>('/catalog/skills')).data, ...forever });
