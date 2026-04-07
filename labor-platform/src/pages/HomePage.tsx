import { HomeHero, RecentAchievements } from '@/features/home/components';
import { RecommendedCourses } from '@/features/courses';
import { Container } from '@/features/shared/components/layout';

export const HomePage = () => {
  return (
    <div>
      <HomeHero />
      <Container className="py-12">
        <h2 className="font-display text-2xl mb-1">📚 推荐课程</h2>
        <p className="text-sm text-text-muted mb-6">
          精选劳动课程，开始你的学习之旅
        </p>
        <RecommendedCourses limit={3} />
      </Container>
      <Container className="py-12 bg-brand-cream/30 -mx-4 px-4">
        <h2 className="font-display text-2xl mb-1">🎨 同学们的作品</h2>
        <p className="text-sm text-text-muted mb-6">
          最新上传的劳动成果，快来为大家点赞吧！
        </p>
        <RecentAchievements limit={4} />
      </Container>
    </div>
  );
};