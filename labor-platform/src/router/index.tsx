import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/features/shared/components/layout';
import { routes } from './routes';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </BrowserRouter>
  );
};