import { HomePage, AchievementsPage, ProfilePage, SubmitPage, CoursesPage } from '@/pages';

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/courses', element: <CoursesPage /> },
  { path: '/achievements', element: <AchievementsPage /> },
  { path: '/achievements/submit', element: <SubmitPage /> },
  { path: '/profile', element: <ProfilePage /> },
];