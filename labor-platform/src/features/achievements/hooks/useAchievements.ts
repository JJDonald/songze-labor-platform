import { useQuery } from '@tanstack/react-query';
import { achievementsApi } from '../api';
import type { AchievementFilters } from '../types';

export const useAchievements = (filters: AchievementFilters) => {
  return useQuery({
    queryKey: ['achievements', filters],
    queryFn: () => achievementsApi.getWall(filters),
  });
};
