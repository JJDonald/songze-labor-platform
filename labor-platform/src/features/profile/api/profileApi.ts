import type { ProfileData } from '../types';
import { api } from '@/lib/api';

export const profileApi = {
  get: async (studentId: string): Promise<ProfileData | null> => {
    const response = await api.get<ProfileData>(`/students/${studentId}/profile`);
    
    if (response.code === 0 && response.data) {
      return response.data;
    }
    
    return null;
  },
};