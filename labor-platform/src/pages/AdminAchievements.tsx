import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import type { AdminAchievement } from '@/features/admin/api/adminApi';

export const AdminAchievements = () => {
  const queryClient = useQueryClient();

  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ['admin', 'achievements'],
    queryFn: adminApi.getAchievements,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateAchievement>[1] }) =>
      adminApi.updateAchievement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteAchievement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements'] });
    },
  });

  const achievements = achievementsData?.data || [];

  const handleTogglePublic = (achievement: AdminAchievement) => {
    updateMutation.mutate({
      id: achievement.id,
      data: { isPublic: !achievement.isPublic },
    });
  };

  const handleDelete = (achievement: AdminAchievement) => {
    if (confirm(`确定要删除成果 "${achievement.title}" 吗？`)) {
      deleteMutation.mutate(achievement.id);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-brand-cream p-6">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream py-8">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-6">🏆 成果管理</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">标题</th>
                <th className="px-4 py-3 text-left">作者</th>
                <th className="px-4 py-3 text-left">描述</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">点赞数</th>
                <th className="px-4 py-3 text-left">创建时间</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {achievements.map((achievement) => (
                <tr key={achievement.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{achievement.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{achievement.student?.avatarEmoji}</span>
                      <span>{achievement.student?.nickname}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{achievement.description}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTogglePublic(achievement)}
                      className={`px-2 py-1 rounded text-xs ${
                        achievement.isPublic
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {achievement.isPublic ? '已公开' : '未公开'}
                    </button>
                  </td>
                  <td className="px-4 py-3">{achievement.likesCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(achievement.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(achievement)}
                      className="text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {achievements.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无成果数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
};