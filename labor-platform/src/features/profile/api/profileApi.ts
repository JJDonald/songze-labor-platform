import type { ProfileData } from '../types';
import { normalizeReviewStatus } from '@/features/achievements/types';
import { api } from '@/lib/api';

interface ProfileResponse extends Omit<ProfileData, 'timeline' | 'badges'> {
  timeline: Array<Omit<ProfileData['timeline'][number], 'reviewStatus' | 'rejectionReason'> & {
    reviewStatus?: string | null;
    reviewComment?: string | null;
    rejectionReason?: string | null;
    rejectReason?: string | null;
  }>;
  badges: Array<Omit<ProfileData['badges'][number], 'threshold' | 'progress' | 'remaining'> & {
    threshold?: number | null;
    progress?: number | null;
    remaining?: number | null;
  }>;
}

const toNonNegativeNumber = (value: number | null | undefined, fallback = 0) =>
  Math.max(0, Number.isFinite(value) ? Number(value) : fallback);

export const profileApi = {
  get: async (studentId: string): Promise<ProfileData | null> => {
    try {
      const response = await api.get<ProfileResponse>(`/students/${studentId}/profile`);
      return {
        ...response.data,
        timeline: response.data.timeline.map((achievement) => ({
          ...achievement,
          reviewStatus: normalizeReviewStatus(achievement.reviewStatus),
          rejectionReason: achievement.reviewComment ?? achievement.rejectionReason ?? achievement.rejectReason ?? null,
        })),
        badges: response.data.badges.map((badge) => {
          const threshold = toNonNegativeNumber(badge.threshold);
          const progress = toNonNegativeNumber(badge.progress, badge.earned ? threshold : 0);
          return {
            ...badge,
            threshold,
            progress,
            remaining: toNonNegativeNumber(badge.remaining, Math.max(0, threshold - progress)),
          };
        }),
      };
    } catch {
      return null;
    }
  },
};