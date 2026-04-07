import { useAchievements } from '@/features/achievements/hooks';
import { AchievementCard } from '@/features/achievements/components';
import { Loading, EmptyState } from '@/features/shared/components/common';

interface RecentAchievementsProps {
  limit?: number;
}

export const RecentAchievements = ({ limit = 4 }: RecentAchievementsProps) => {
  const { data, isLoading } = useAchievements({ page: 0, limit });

  if (isLoading) return <Loading />;

  if (!data?.data.length) {
    return <EmptyState message="暂无成果数据" icon="📭" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.data.slice(0, limit).map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </div>
  );
};