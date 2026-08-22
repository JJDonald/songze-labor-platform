import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'achievements', 'pending-count'],
    queryFn: () => adminApi.getAchievements({ status: 'PENDING', page: 1, pageSize: 1 }),
  });

  const stats = statsData?.data;
  const pendingPayload = pendingData?.data;
  const pendingCount = stats?.pendingAchievements
    ?? stats?.pendingReviewCount
    ?? (Array.isArray(pendingPayload)
      ? pendingPayload.filter((achievement) => (achievement.reviewStatus || 'PENDING') === 'PENDING').length
      : pendingPayload?.total)
    ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream p-6 flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  const statCards = [
    { label: '注册用户', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-blue-100' },
    { label: '课程总数', value: stats?.totalCourses || 0, icon: '📚', color: 'bg-green-100' },
    { label: '成果总数', value: stats?.totalAchievements || 0, icon: '🏆', color: 'bg-yellow-100' },
    { label: '待审核成果', value: pendingCount, icon: '⏳', color: 'bg-amber-100' },
  ];

  const quickLinks = [
    { label: '学生名册', path: '/admin/roster', icon: '📋', desc: '导入名册并控制注册模式' },
    { label: '用户管理', path: '/admin/users', icon: '👥', desc: '添加、编辑、删除用户账户' },
    { label: '课程管理', path: '/admin/courses', icon: '📚', desc: '管理课程内容和封面图片' },
    { label: '成果审核', path: '/admin/achievements', icon: '🏆', desc: `审核学生成果，当前待处理 ${pendingCount} 条` },
    { label: 'AI 评价管理', path: '/admin/evaluation-dimensions', icon: '🤖', desc: '配置 AI URL / API Key / Model 与评价维度' },
  ];

  return (
    <div className="min-h-screen bg-brand-cream py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold sm:mb-8 sm:text-3xl">👨‍💼 管理后台</h1>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4 sm:p-6`}>
              <div className="mb-2 text-3xl sm:text-4xl">{stat.icon}</div>
              <div className="text-2xl font-bold sm:text-3xl">{stat.value}</div>
              <div className="text-sm text-gray-600 sm:text-base">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-bold sm:text-xl">快捷入口</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block rounded-lg border p-4 transition-all hover:border-brand-green hover:shadow-md"
              >
                <div className="mb-2 text-2xl">{link.icon}</div>
                <div className="font-bold">{link.label}</div>
                <div className="text-sm text-gray-500">{link.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
