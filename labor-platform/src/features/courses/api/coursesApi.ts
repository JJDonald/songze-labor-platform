import type { Course, CourseFilters } from '../types';
import { api } from '@/lib/api';

export const coursesApi = {
  getAll: async (filters?: CourseFilters): Promise<Course[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.gradeId) queryParams.set('gradeId', filters.gradeId.toString());
    if (filters?.taskGroupId) queryParams.set('taskGroupId', filters.taskGroupId);
    if (filters?.search) queryParams.set('search', filters.search);

    try {
      const response = await api.get<Course[]>(`/courses?${queryParams.toString()}`);
      return response.data;
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<Course | null> => {
    try {
      const response = await api.get<Course>(`/courses/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },
};