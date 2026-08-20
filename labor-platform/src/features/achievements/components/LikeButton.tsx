import { cn } from '@/features/shared/lib';
import { useLike } from '../hooks';

interface LikeButtonProps {
  achievementId: string;
  likesCount: number;
  isLiked: boolean;
}

export const LikeButton = ({ achievementId, likesCount, isLiked }: LikeButtonProps) => {
  const likeMutation = useLike(achievementId);

  return (
    <button
      aria-label={isLiked ? '取消点赞' : '点赞'}
      onClick={(e) => {
        e.stopPropagation();
        likeMutation.mutate();
      }}
      className={cn(
        'flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer',
        isLiked
          ? 'border-brand-orange bg-brand-orange-pale text-brand-orange'
          : 'border-gray-200 text-text-muted hover:border-brand-orange hover:bg-brand-orange-pale hover:text-brand-orange'
      )}
    >
      ❤️ {likesCount}
    </button>
  );
};