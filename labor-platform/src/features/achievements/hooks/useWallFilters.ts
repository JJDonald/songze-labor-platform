import { useState } from 'react';

export const useWallFilters = () => {
  const [taskGroupId, setTaskGroupIdState] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;

  return {
    filters: { taskGroupId, page, limit },
    setTaskGroupId: (id?: string) => {
      setTaskGroupIdState(id);
      setPage(0);
    },
    setPage,
    resetFilters: () => {
      setTaskGroupIdState(undefined);
      setPage(0);
    },
  };
};
