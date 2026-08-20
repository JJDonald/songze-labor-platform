import type { Achievement, AchievementFilters } from '../types';
import { api } from '@/lib/api';

interface AchievementResponse {
  id: string;
  student: {
    id: string;
    nickname: string;
    avatarEmoji: string;
    gradeId: number;
    classCode: string;
  };
  course: {
    title: string;
    taskGroupId: string;
  } | null;
  title: string;
  description: string;
  images: string[];
  evalAttitude: number;
  evalSkill: number;
  evalResult: number;
  avgAttitude: number;
  avgSkill: number;
  avgResult: number;
  evalCount: number;
  likesCount: number;
  createdAt: string;
  isLikedByMe: boolean;
}

interface WallResponse {
  data: AchievementResponse[];
  total: number;
}

interface AchievementDetail {
  id: string;
  student: Achievement['student'];
  course: Achievement['course'] | null;
  title: string;
  description: string;
  reflection?: string;
  images: string[];
  evalAttitude: number;
  evalSkill: number;
  evalResult: number;
  avgAttitude: number;
  avgSkill: number;
  avgResult: number;
  evalCount: number;
  likesCount: number;
  createdAt: string;
  isLikedByMe: boolean;
  myEvaluation?: {
    attitude: number;
    skill: number;
    result: number;
  } | null;
  isOwner: boolean;
  evaluationDimensions?: EvaluationDimension[];
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
}

export interface AiEvaluationResult {
  scores: {
    attitude: number;
    skill: number;
    result: number;
  };
  summary: string;
  suggestions: string[];
  source: 'agent' | 'local';
  avgAttitude: number;
  avgSkill: number;
  avgResult: number;
  evalCount: number;
}

export const achievementsApi = {
  getWall: async (params: AchievementFilters): Promise<{ data: Achievement[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params.taskGroupId) queryParams.set('taskGroupId', params.taskGroupId);
    queryParams.set('page', params.page.toString());
    queryParams.set('limit', params.limit.toString());

    try {
      const response = await api.get<WallResponse>(`/achievements?${queryParams.toString()}`);
      const achievements: Achievement[] = response.data.data.map((a) => ({
        id: a.id,
        student: a.student,
        course: a.course || { title: '劳动项目', taskGroupId: 'other' },
        title: a.title,
        description: a.description,
        images: a.images,
        evalAttitude: a.evalAttitude,
        evalSkill: a.evalSkill,
        evalResult: a.evalResult,
        avgAttitude: a.avgAttitude,
        avgSkill: a.avgSkill,
        avgResult: a.avgResult,
        evalCount: a.evalCount,
        likesCount: a.likesCount,
        createdAt: a.createdAt,
        isLikedByMe: a.isLikedByMe,
      }));
      return { data: achievements, total: response.data.total };
    } catch {
      return { data: [], total: 0 };
    }
  },

  create: async (data: {
    title: string;
    description: string;
    reflection?: string;
    images: string[];
    isPublic: boolean;
    evalAttitude: number;
    evalSkill: number;
    evalResult: number;
    courseId?: string;
    courseTitle?: string;
  }): Promise<boolean> => {
    try {
      await api.post('/achievements', data);
      return true;
    } catch {
      return false;
    }
  },

  like: async (achievementId: string): Promise<{ liked: boolean } | null> => {
    try {
      const response = await api.post<{ liked: boolean }>(`/achievements/${achievementId}/like`);
      return response.data;
    } catch {
      return null;
    }
  },

  uploadImage: async (file: File): Promise<string | null> => {
    try {
      const response = await api.upload<{ url: string }>('/achievements/upload', file);
      return response.data.url;
    } catch {
      return null;
    }
  },

  update: async (id: string, data: {
    title: string;
    description: string;
    reflection?: string;
    images: string[];
    isPublic: boolean;
    evalAttitude: number;
    evalSkill: number;
    evalResult: number;
  }): Promise<boolean> => {
    try {
      await api.put(`/achievements/${id}`, data);
      return true;
    } catch {
      return false;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/achievements/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  getById: async (id: string): Promise<AchievementDetail | null> => {
    try {
      const response = await api.get<AchievementDetail>(`/achievements/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  evaluate: async (id: string, attitude: number, skill: number, result: number): Promise<boolean> => {
    try {
      await api.post(`/achievements/${id}/evaluate`, { attitude, skill, result });
      return true;
    } catch {
      return false;
    }
  },

  aiEvaluate: async (id: string): Promise<AiEvaluationResult | null> => {
    try {
      const response = await api.post<AiEvaluationResult>(`/achievements/${id}/ai-evaluate`);
      return response.data;
    } catch {
      return null;
    }
  },
};
