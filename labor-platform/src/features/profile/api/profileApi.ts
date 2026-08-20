import type { ProfileData } from '../types';
import { api } from '@/lib/api';

export const profileApi = {
  get: async (studentId: string): Promise<ProfileData | null> => {
    try {
      const response = await api.get<ProfileData>(`/students/${studentId}/profile`);
      return response.data;
    } catch {
      return null;
    }
  },
};