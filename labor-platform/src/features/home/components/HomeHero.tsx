import { Button } from '@/features/shared/components/ui';
import { useNavigate } from 'react-router-dom';

export const HomeHero = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-brand-green via-[#3d8b6a] to-brand-green-light py-16 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-[1100px] mx-auto relative z-10">
        <div className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 px-3.5 py-1.5 rounded-full text-sm mb-5 border border-white/20">
          🏫 劳动课程平台
        </div>

        <h1 className="font-display text-4xl text-white mb-4">
          用双手创造
          <br />
          <span className="text-brand-yellow">美好生活</span>
        </h1>

        <p className="text-base text-white/80 mb-8 max-w-[480px]">
          记录你的每一次劳动成果，让努力被看见！
        </p>

        <div className="flex gap-3">
          <Button variant="primary" onClick={() => navigate('/achievements')}>
            🎨 查看成果墙
          </Button>
          <Button
            variant="orange"
            onClick={() => navigate('/achievements/submit')}
          >
            ✍️ 提交成果
          </Button>
        </div>
      </div>
    </div>
  );
};