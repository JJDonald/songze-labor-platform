import { useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsApi } from '../api';
import type { Achievement } from '../types';

interface AchievementList {
  data: Achievement[];
  total: number;
}

export const useLike = (achievementId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await achievementsApi.like(achievementId);
    },

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['achievements'] });

      const previousData = queryClient.getQueryData<AchievementList>(['achievements']);

      queryClient.setQueryData<AchievementList>(['achievements'], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((a) =>
            a.id === achievementId
              ? {
                  ...a,
                  likesCount: a.isLikedByMe ? a.likesCount - 1 : a.likesCount + 1,
                  isLikedByMe: !a.isLikedByMe,
                }
              : a
          ),
        };
      });

      return { previousData };
    },

    onError: (_err, _variables, context?: { previousData?: AchievementList }) => {
      queryClient.setQueryData(['achievements'], context?.previousData);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
};