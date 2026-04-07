import type { BadgeStatus } from '../types';
import { BadgeItem } from './BadgeItem';

interface BadgesCardProps {
  badges: BadgeStatus[];
}

export const BadgesCard = ({ badges }: BadgesCardProps) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="font-display text-xl mb-4">🏅 我的徽章</h3>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
};
