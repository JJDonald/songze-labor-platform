import { HomePage, AchievementsPage, ProfilePage, SubmitPage, CoursesPage, AdminDashboard, AdminUsers, AdminCourses, AdminAchievements, AdminRoster, AdminEvaluationDimensions, NotFoundPage } from '@/pages';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/courses', element: <CoursesPage /> },
  { path: '/achievements', element: <AchievementsPage /> },
  { path: '/achievements/submit', element: <ProtectedRoute><SubmitPage /></ProtectedRoute> },
  { path: '/profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
  { path: '/admin', element: <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute> },
  { path: '/admin/users', element: <ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute> },
  { path: '/admin/roster', element: <ProtectedRoute requireAdmin><AdminRoster /></ProtectedRoute> },
  { path: '/admin/courses', element: <ProtectedRoute requireAdmin><AdminCourses /></ProtectedRoute> },
  { path: '/admin/achievements', element: <ProtectedRoute requireAdmin><AdminAchievements /></ProtectedRoute> },
  { path: '/admin/evaluation-dimensions', element: <ProtectedRoute requireAdmin><AdminEvaluationDimensions /></ProtectedRoute> },
  { path: '*', element: <NotFoundPage /> },
];
