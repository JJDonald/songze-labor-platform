export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const normalizeReviewStatus = (status?: string | null): ReviewStatus => {
  const normalized = status?.toUpperCase();
  return REVIEW_STATUSES.includes(normalized as ReviewStatus)
    ? (normalized as ReviewStatus)
    : 'PENDING';
};

export interface Achievement {
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
  };
  title: string;
  description: string;
  reflection?: string;
  images: string[];
  isPublic?: boolean;
  reviewStatus?: ReviewStatus;
  rejectionReason?: string | null;
  evalAttitude: number;
  evalSkill: number;
  evalResult: number;
  avgAttitude?: number;
  avgSkill?: number;
  avgResult?: number;
  evalCount?: number;
  likesCount: number;
  createdAt: Date | string;
  isLikedByMe: boolean;
}

export interface AchievementMutationResult {
  id?: string;
  reviewStatus: ReviewStatus;
  rejectionReason?: string | null;
}

export interface AchievementFilters {
  taskGroupId?: string;
  page: number;
  limit: number;
}