import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const [hasHydrated, setHasHydrated] = useState(() => useUserStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useUserStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    if (useUserStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    return unsub;
  }, []);

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
};
