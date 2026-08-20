import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/features/shared/components/layout';
import { routes } from './routes';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="min-w-0">
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};