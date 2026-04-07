import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../api/coursesApi';
import type { CourseFilters } from '../types';

export const useCourses = (filters?: CourseFilters) => {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => coursesApi.getAll(filters),
  });
};

export const useCourse = (id: string) => {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.getById(id),
    enabled: !!id,
  });
};