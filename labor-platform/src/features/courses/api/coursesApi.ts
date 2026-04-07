import type { Course, CourseFilters } from '../types';
import { api } from '@/lib/api';

export const coursesApi = {
  getAll: async (filters?: CourseFilters): Promise<Course[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.gradeId) queryParams.set('gradeId', filters.gradeId.toString());
    if (filters?.taskGroupId) queryParams.set('taskGroupId', filters.taskGroupId);
    if (filters?.search) queryParams.set('search', filters.search);

    const response = await api.get<Course[]>(`/courses?${queryParams.toString()}`);
    
    if (response.code === 0 && response.data) {
      return response.data;
    }
    return [];
  },

  getById: async (id: string): Promise<Course | null> => {
    const response = await api.get<Course>(`/courses/${id}`);
    
    if (response.code === 0 && response.data) {
      return response.data;
    }
    return null;
  },
};