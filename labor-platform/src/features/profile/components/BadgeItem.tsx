import { cn } from '@/features/shared/lib';
import type { BadgeStatus } from '../types';

interface BadgeItemProps {
  badge: BadgeStatus;
}

export const BadgeItem = ({ badge }: BadgeItemProps) => {
  return (
    <div
      className={cn(
        'text-center p-3 bg-brand-cream rounded-xl',
        !badge.earned && 'opacity-35'
      )}
    >
      <div className="text-2xl mb-1">{badge.emoji}</div>
      <div className="text-xs text-text-soft font-semibold">{badge.name}</div>
    </div>
  );
};
