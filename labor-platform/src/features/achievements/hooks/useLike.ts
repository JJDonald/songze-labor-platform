import { useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsApi } from '../api';
import type { Achievement } from '../types';

interface AchievementList {
  data: Achievement[];
  total: number;
}

export const useLike = (achievementId: string) => {
  const queryClient = useQueryClient();

  const toggleLike = (old?: AchievementList) => {
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
  };

  return useMutation({
    mutationFn: async () => {
      const result = await achievementsApi.like(achievementId);
      if (!result) {
        throw new Error('点赞失败，请先登录');
      }
      return result;
    },

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['achievements'] });
      const previous = queryClient.getQueriesData<AchievementList>({ queryKey: ['achievements'] });
      queryClient.setQueriesData<AchievementList>({ queryKey: ['achievements'] }, toggleLike);
      return { previous };
    },

    onError: (_err, _variables, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
};
