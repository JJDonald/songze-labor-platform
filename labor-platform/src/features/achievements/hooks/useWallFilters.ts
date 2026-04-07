import { useState } from 'react';

export const useWallFilters = () => {
  const [taskGroupId, setTaskGroupId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;

  return {
    filters: { taskGroupId, page, limit },
    setTaskGroupId,
    setPage,
    resetFilters: () => {
      setTaskGroupId(undefined);
      setPage(0);
    },
  };
};