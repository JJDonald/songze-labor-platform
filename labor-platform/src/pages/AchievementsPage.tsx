import { WallHeader, WallGrid } from '@/features/achievements/components';
import { useAchievements, useWallFilters } from '@/features/achievements/hooks';
import { Container } from '@/features/shared/components/layout';
import { Loading, EmptyState } from '@/features/shared/components/common';

export const AchievementsPage = () => {
  const { filters, setTaskGroupId } = useWallFilters();
  const { data, isLoading } = useAchievements(filters);

  return (
    <div>
      <WallHeader
        activeFilter={filters.taskGroupId}
        onFilterChange={setTaskGroupId}
      />
      <Container className="py-8">
        {isLoading ? (
          <Loading />
        ) : !data?.data.length ? (
          <EmptyState message="暂无成果数据" icon="📭" />
        ) : (
          <WallGrid achievements={data.data} />
        )}
      </Container>
    </div>
  );
};