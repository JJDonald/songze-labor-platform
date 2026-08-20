import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/features/shared/lib';
import { Container } from './Container';
import { Button } from '@/features/shared/components/ui';
import { AccountMenu } from '@/features/auth';
import { useUserStore } from '@/features/auth/store/useUserStore';

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/courses', label: '课程学习', icon: '📚' },
  { path: '/achievements', label: '成果墙', icon: '🎨' },
  { path: '/profile', label: '我的档案', icon: '👤' },
];

const adminNavItems = [
  { path: '/admin', label: '管理后台', icon: '🧑‍💼' },
];

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useUserStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'ADMIN';
  const [mobileOpen, setMobileOpen] = useState(false);

  // 用 location.key 作为重置条件，避免在 effect 中同步 setState
  const [menuKey, setMenuKey] = useState(location.key);

  if (menuKey !== location.key) {
    setMenuKey(location.key);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-brand-sand bg-brand-cream/95 backdrop-blur-lg safe-top">
      <Container className="flex h-14 items-center justify-between gap-2 sm:h-16">
        <button
          type="button"
          className="flex min-w-0 cursor-pointer items-center gap-2"
          onClick={() => go('/')}
        >
          <span className="text-2xl sm:text-3xl">🌱</span>
          <span className="font-display truncate text-lg text-brand-green sm:text-xl">劳动课堂</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-2 text-sm font-semibold transition-all xl:px-4',
                isActive(item.path)
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
              onClick={() => go(item.path)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-2 text-sm font-semibold transition-all xl:px-4',
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
            onClick={() => go('/achievements/submit')}
            className="ml-2"
          >
            ✍️ 提交成果
          </Button>

          <div className="ml-2">
            <AccountMenu />
          </div>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="scale-95">
            <AccountMenu />
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-sand bg-white text-lg font-bold text-brand-green shadow-sm"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </Container>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 top-14 z-40 bg-black/35 sm:top-16"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-x-0 top-full z-50 border-b border-brand-sand bg-brand-cream shadow-lg">
            <div className="mx-auto max-w-[1100px] space-y-2 px-4 py-3 sm:px-6">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold',
                    isActive(item.path)
                      ? 'bg-brand-green text-white'
                      : 'bg-white text-text-soft'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {isAdmin && adminNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold',
                    location.pathname.startsWith('/admin')
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-700'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              <Button
                variant="orange"
                onClick={() => go('/achievements/submit')}
                className="mt-1 w-full justify-center"
              >
                ✍️ 提交成果
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
