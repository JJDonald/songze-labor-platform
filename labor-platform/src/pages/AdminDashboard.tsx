import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/adminApi';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });

  const stats = statsData?.data;

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
    { label: '点赞总数', value: stats?.totalLikes || 0, icon: '❤️', color: 'bg-pink-100' },
  ];

  const quickLinks = [
    { label: '用户管理', path: '/admin/users', icon: '👥', desc: '添加、编辑、删除用户账户' },
    { label: '课程管理', path: '/admin/courses', icon: '📚', desc: '管理课程内容和封面图片' },
    { label: '成果管理', path: '/admin/achievements', icon: '🏆', desc: '审核和删除学生成果' },
    { label: '评价维度', path: '/admin/evaluation-dimensions', icon: '🤖', desc: '配置 AI 智能体评价标准' },
  ];

  return (
    <div className="min-h-screen bg-brand-cream py-8">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8">👨‍💼 管理后台</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-6`}>
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">快捷入口</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block p-4 border rounded-lg hover:border-brand-green hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">{link.icon}</div>
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
