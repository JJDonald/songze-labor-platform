import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api';

export const useProfile = (studentId: string) => {
  return useQuery({
    queryKey: ['profile', studentId],
    queryFn: () => profileApi.get(studentId),
    enabled: !!studentId,
  });
};