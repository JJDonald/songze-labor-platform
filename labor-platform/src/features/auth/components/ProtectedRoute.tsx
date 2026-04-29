import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  
  // 修复：等待 Zustand persist 恢复完成。默认为 false，防止刷新页面时未恢复状态就进行判断
  const hasHydrated = useUserStore.persist.hasHydrated?.();

  if (!hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && currentUser.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
