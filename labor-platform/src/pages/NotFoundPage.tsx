import { Link } from 'react-router-dom';
import { Container } from '@/features/shared/components/layout';

export const NotFoundPage = () => {
  return (
    <Container className="py-20 text-center">
      <div className="text-6xl mb-4">🧭</div>
      <h1 className="font-display text-3xl mb-2">页面不存在</h1>
      <p className="text-text-muted mb-6">你访问的地址没有对应页面。</p>
      <Link to="/" className="text-brand-green font-semibold hover:underline">
        返回首页
      </Link>
    </Container>
  );
};
