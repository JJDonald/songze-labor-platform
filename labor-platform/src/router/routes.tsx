import { HomePage, AchievementsPage, ProfilePage, SubmitPage, CoursesPage, AdminDashboard, AdminUsers, AdminCourses, AdminAchievements } from '@/pages';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/courses', element: <CoursesPage /> },
  { path: '/achievements', element: <AchievementsPage /> },
  { path: '/achievements/submit', element: <SubmitPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/admin', element: <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute> },
  { path: '/admin/users', element: <ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute> },
  { path: '/admin/courses', element: <ProtectedRoute requireAdmin><AdminCourses /></ProtectedRoute> },
  { path: '/admin/achievements', element: <ProtectedRoute requireAdmin><AdminAchievements /></ProtectedRoute> },
];