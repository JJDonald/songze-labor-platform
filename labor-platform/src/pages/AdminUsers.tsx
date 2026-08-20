import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import type { AdminUser } from '@/features/admin/api/adminApi';
import { useUserStore } from '@/features/auth/store/useUserStore';

export const AdminUsers = () => {
  const queryClient = useQueryClient();
  const currentUser = useUserStore((state) => state.currentUser);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    nickname: '',
    gradeId: 6,
    classCode: '',
    role: 'STUDENT',
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.getUsers,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof Error ? err.message : '创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof Error ? err.message : '更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : '删除失败'),
  });

  const users = usersData?.data || [];

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ studentId: '', password: '', nickname: '', gradeId: 6, classCode: '', role: 'STUDENT' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      studentId: user.studentId,
      password: '',
      nickname: user.nickname,
      gradeId: user.gradeId,
      classCode: user.classCode,
      role: user.role,
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          nickname: formData.nickname,
          password: formData.password || undefined,
          classCode: formData.classCode,
          role: formData.role,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      alert('不能删除自己的账户');
      return;
    }
    if (confirm(`确定要删除用户 "${user.nickname}" 吗？`)) {
      deleteMutation.mutate(user.id);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-brand-cream p-6">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">👥 用户管理</h1>
          <button
            onClick={openCreateModal}
            className="rounded-lg bg-brand-green px-5 py-2.5 text-white hover:bg-brand-green-light sm:px-6"
          >
            + 添加用户
          </button>
        </div>

        <div className="table-scroll overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">头像</th>
                <th className="px-4 py-3 text-left">学籍号</th>
                <th className="px-4 py-3 text-left">昵称</th>
                <th className="px-4 py-3 text-left">角色</th>
                <th className="px-4 py-3 text-left">班级</th>
                <th className="px-4 py-3 text-left">成果数</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3 text-2xl">{user.avatarEmoji}</td>
                  <td className="px-4 py-3">{user.studentId}</td>
                  <td className="px-4 py-3 font-medium">{user.nickname}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role === 'ADMIN' ? '管理员' : '学生'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{user.grade?.name} {user.classCode}</td>
                  <td className="px-4 py-3">{user.totalAchievements}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-brand-green hover:underline mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-red-500 hover:underline"
                      disabled={user.id === currentUser?.id}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 safe-bottom sm:rounded-xl sm:p-6">
            <h2 className="mb-4 text-xl font-bold">{editingUser ? '编辑用户' : '添加用户'}</h2>
            <form onSubmit={handleSubmit}>
              {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">学籍号</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!!editingUser}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">昵称</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    密码 {editingUser && <span className="text-gray-400">(留空则不修改)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">班级</label>
                  <input
                    type="text"
                    value={formData.classCode}
                    onChange={(e) => setFormData({ ...formData, classCode: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">角色</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="STUDENT">学生</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-light"
                >
                  {editingUser ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};