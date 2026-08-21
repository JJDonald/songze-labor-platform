import { api } from '@/lib/api';
import type { ReviewStatus } from '@/features/achievements/types';

export interface AdminUser {
  id: string;
  studentId: string;
  nickname: string;
  avatarEmoji: string;
  role: string;
  gradeId: number;
  classCode: string;
  totalAchievements: number;
  totalLikes: number;
  createdAt: string;
  grade?: { name: string };
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  objectives: string;
  materials: string;
  steps: string;
  safetyTips: string;
  gradeId: number;
  semesterId: number;
  taskGroupId: string;
  emoji: string;
  color: string;
  coverImage: string | null;
  demoVideo: string | null;
  demoImages: string | null;
  isActive: boolean;
  createdAt: string;
  grade?: { id: number; name: string };
  taskGroup?: { id: string; name: string; icon: string };
}

export interface AdminAchievement {
  id: string;
  title: string;
  description: string;
  reflection?: string | null;
  images?: string[] | string | null;
  isPublic: boolean;
  reviewStatus?: ReviewStatus;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  evalAttitude?: number;
  evalSkill?: number;
  evalResult?: number;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId: string;
    nickname: string;
    avatarEmoji: string;
    gradeId?: number;
    classCode?: string;
  };
  course?: {
    id?: string;
    title: string;
    taskGroupId?: string;
  } | null;
}

export type AchievementReviewStatus = ReviewStatus;

export interface AdminAchievementPage {
  data: AdminAchievement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AchievementReviewInput {
  status: Exclude<AchievementReviewStatus, 'PENDING'>;
  reviewComment?: string;
  expectedUpdatedAt: string;
}

export interface BatchAchievementReviewInput {
  status: Exclude<AchievementReviewStatus, 'PENDING'>;
  reviewComment?: string;
  items: Array<{ id: string; expectedUpdatedAt: string }>;
}

export interface TaskGroup {
  id: string;
  name: string;
  icon: string;
  type: string;
  sortOrder: number;
}

export interface Grade {
  id: number;
  name: string;
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalAchievements: number;
  totalLikes: number;
  pendingAchievements?: number;
  pendingReviewCount?: number;
}

export interface EvaluationDimension {
  id: string;
  key: 'attitude' | 'skill' | 'result';
  label: string;
  description: string;
  prompt: string;
  weight: number;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AiThinkingLevel = 'off' | 'low' | 'medium' | 'high';

export interface AiSettings {
  provider: 'custom' | 'openai_compatible';
  baseUrl: string;
  model: string;
  endpointPath: string;
  temperature: number;
  thinkingLevel: AiThinkingLevel;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
  source: 'database' | 'env' | 'default';
  evaluateUrl: string;
}

export interface AiSettingsUpdateInput {
  provider?: 'custom' | 'openai_compatible';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  endpointPath?: string;
  temperature?: number;
  thinkingLevel?: AiThinkingLevel;
  enabled?: boolean;
  clearApiKey?: boolean;
}

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
  evaluateUrl?: string;
  status?: number;
  settings?: AiSettings;
}

export const adminApi = {
  // Stats
  getStats: () => api.get<AdminStats>('/admin/stats'),

  // Users
  getUsers: () => api.get<AdminUser[]>('/admin/users'),
  createUser: (data: { studentId: string; password?: string; nickname: string; gradeId: number; classCode: string; role?: string }) =>
    api.post<AdminUser>('/admin/users', data),
  updateUser: (id: string, data: { nickname?: string; password?: string; classCode?: string; role?: string }) =>
    api.put<AdminUser>(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete<void>(`/admin/users/${id}`),

  // Courses
  getCourses: () => api.get<AdminCourse[]>('/admin/courses'),
  createCourse: (data: {
    title: string;
    description: string;
    objectives: string | string[];
    materials: string | string[];
    steps: string | string[];
    safetyTips: string;
    gradeId: number;
    semesterId: number;
    taskGroupId: string;
    emoji?: string;
    color?: string;
    coverImage?: string;
    demoVideo?: string;
    demoImages?: string;
  }) => api.post<AdminCourse>('/admin/courses', data),
  updateCourse: (id: string, data: Partial<{
    title: string;
    description: string;
    objectives: string | string[];
    materials: string | string[];
    steps: string | string[];
    safetyTips: string;
    gradeId: number;
    semesterId: number;
    taskGroupId: string;
    emoji: string;
    color: string;
    coverImage: string;
    demoVideo: string;
    demoImages: string;
    isActive: boolean;
  }>) => api.put<AdminCourse>(`/admin/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete<void>(`/admin/courses/${id}`),

  // Achievements
  getAchievements: (params: { status?: AchievementReviewStatus; page?: number; pageSize?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const query = search.toString();
    return api.get<AdminAchievementPage | AdminAchievement[]>(`/admin/achievements${query ? `?${query}` : ''}`);
  },
  reviewAchievement: (id: string, data: AchievementReviewInput) =>
    api.request<AdminAchievement>(`/admin/achievements/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  batchReviewAchievements: (data: BatchAchievementReviewInput) =>
    api.post<{ updated: number }>('/admin/achievements/batch-review', data),
  updateAchievement: (id: string, data: { isPublic?: boolean; title?: string; description?: string }) =>
    api.put<AdminAchievement>(`/admin/achievements/${id}`, data),
  deleteAchievement: (id: string) => api.delete<void>(`/admin/achievements/${id}`),

  // Reference data
  getTaskGroups: () => api.get<TaskGroup[]>('/admin/task-groups'),
  getGrades: () => api.get<Grade[]>('/admin/grades'),

  // Evaluation dimensions
  getEvaluationDimensions: () => api.get<EvaluationDimension[]>('/admin/evaluation-dimensions'),
  updateEvaluationDimensions: (dimensions: EvaluationDimension[]) =>
    api.put<EvaluationDimension[]>('/admin/evaluation-dimensions', { dimensions }),
  resetEvaluationDimensions: () => api.post<EvaluationDimension[]>('/admin/evaluation-dimensions/reset'),

  // AI service settings
  getAiSettings: () => api.get<AiSettings>('/admin/ai-settings'),
  updateAiSettings: (data: AiSettingsUpdateInput) => api.put<AiSettings>('/admin/ai-settings', data),
  testAiSettings: () => api.post<AiConnectionTestResult>('/admin/ai-settings/test'),

  // Upload
  uploadImage: (file: File) => api.upload<{ url: string; filename: string }>('/upload', file),
  uploadFile: (file: File) => api.upload<{ url: string; filename: string }>('/upload', file),
};
