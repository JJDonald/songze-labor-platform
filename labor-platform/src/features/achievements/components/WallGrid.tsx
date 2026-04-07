import type { Achievement } from '../types';
import { AchievementCard } from './AchievementCard';

interface WallGridProps {
  achievements: Achievement[];
}

export const WallGrid = ({ achievements }: WallGridProps) => {
  return (
    <div className="wall-grid">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </div>
  );
};
