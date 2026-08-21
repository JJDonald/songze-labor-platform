import { cn, formatDate } from '@/features/shared/lib';
import type { BadgeStatus } from '../types';

interface BadgeItemProps {
  badge: BadgeStatus;
}

export const BadgeItem = ({ badge }: BadgeItemProps) => {
  const percentage = badge.threshold > 0
    ? Math.min(100, Math.round((badge.progress / badge.threshold) * 100))
    : (badge.earned ? 100 : 0);

  return (
    <div
      className={cn(
        'p-3 bg-brand-cream rounded-xl',
        !badge.earned && 'text-text-muted'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn('text-2xl', !badge.earned && 'grayscale opacity-50')}>{badge.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-text-soft font-semibold">{badge.name}</div>
          <div className="mt-0.5 text-xs text-text-muted">
            {badge.progress} / {badge.threshold}
          </div>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" aria-label={`徽章进度 ${percentage}%`}>
        <div
          className={cn('h-full rounded-full', badge.earned ? 'bg-brand-green' : 'bg-brand-yellow')}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-1.5 text-xs text-text-muted">
        {badge.earned
          ? (badge.earnedAt ? `${formatDate(badge.earnedAt)} 获得` : '已获得')
          : `还差 ${badge.remaining}`}
      </div>
    </div>
  );
};
