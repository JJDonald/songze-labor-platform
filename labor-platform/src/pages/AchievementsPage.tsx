import { WallHeader, WallGrid } from '@/features/achievements/components';
import { useAchievements, useWallFilters } from '@/features/achievements/hooks';
import { Container } from '@/features/shared/components/layout';
import { Loading, EmptyState } from '@/features/shared/components/common';

export const AchievementsPage = () => {
  const { filters, setTaskGroupId, setPage } = useWallFilters();
  const { data, isLoading } = useAchievements(filters);
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / filters.limit));

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
          <>
            <WallGrid achievements={data.data} />
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  className="rounded-full border px-4 py-1.5 text-sm disabled:opacity-40"
                  disabled={filters.page <= 0}
                  onClick={() => setPage(filters.page - 1)}
                >
                  上一页
                </button>
                <span className="text-sm text-text-muted">
                  第 {filters.page + 1} / {totalPages} 页
                </span>
                <button
                  className="rounded-full border px-4 py-1.5 text-sm disabled:opacity-40"
                  disabled={filters.page + 1 >= totalPages}
                  onClick={() => setPage(filters.page + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
};