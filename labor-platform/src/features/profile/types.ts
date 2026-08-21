import type { Achievement } from '@/features/achievements/types';

export interface StudentProfile {
  id: string;
  nickname: string;
  avatarEmoji: string;
  grade: { id: number; name: string };
  classCode: string;
  stats: {
    totalAchievements: number;
    totalLikes: number;
    totalBadges: number;
  };
  evalAverage: {
    attitude: number;
    skill: number;
    result: number;
  };
}

export interface BadgeStatus {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  threshold: number;
  progress: number;
  remaining: number;
  earnedAt?: Date | string | null;
}

export interface ProfileData {
  profile: StudentProfile;
  timeline: Achievement[];
  badges: BadgeStatus[];
}
