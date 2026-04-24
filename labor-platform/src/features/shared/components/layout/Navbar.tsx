import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/features/shared/lib';
import { Container } from './Container';
import { Button } from '@/features/shared/components/ui';
import { AccountMenu } from '@/features/auth';
import { useUserStore } from '@/features/auth/store/useUserStore';

const navItems = [
  { path: '/', label: '首页' },
  { path: '/courses', label: '课程学习' },
  { path: '/achievements', label: '成果展示墙' },
  { path: '/profile', label: '我的档案' },
];

const adminNavItems = [
  { path: '/admin', label: '管理后台' },
];

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useUserStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <nav className="sticky top-0 z-50 bg-brand-cream/95 backdrop-blur-lg border-b-2 border-brand-sand h-16 flex items-center px-6">
      <Container className="flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="text-3xl">🌱</span>
          <span className="font-display text-xl text-brand-green">劳动课堂</span>
        </div>

        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer',
                location.pathname === item.path
                  ? 'bg-brand-green text-white'
                  : 'text-text-soft hover:bg-brand-green-pale'
              )}
            >
              {item.label}
            </button>
          ))}
          
          {isAdmin && adminNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer',
                location.pathname.startsWith('/admin')
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-600 hover:bg-purple-100'
              )}
            >
              {item.label}
            </button>
          ))}
          
          <Button
            variant="orange"
            size="sm"
            onClick={() => navigate('/achievements/submit')}
            className="ml-2"
          >
            ✍️ 提交成果
          </Button>

          <div className="ml-2">
            <AccountMenu />
          </div>
        </div>
      </Container>
    </nav>
  );
};