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

export interface AchievementFilters {
  taskGroupId?: string;
  page: number;
  limit: number;
}