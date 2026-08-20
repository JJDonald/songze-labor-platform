import { Button } from '@/features/shared/components/ui';
import { useNavigate } from 'react-router-dom';

export const HomeHero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-green via-[#3d8b6a] to-brand-green-light px-4 py-10 sm:px-6 sm:py-16">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px]">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs text-white/90 sm:mb-5 sm:text-sm">
          🏫 劳动课程平台
        </div>

        <h1 className="mb-3 font-display text-3xl leading-tight text-white sm:mb-4 sm:text-4xl">
          用双手创造
          <br />
          <span className="text-brand-yellow">美好生活</span>
        </h1>

        <p className="mb-6 max-w-[480px] text-sm text-white/80 sm:mb-8 sm:text-base">
          记录你的每一次劳动成果，让努力被看见！
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" onClick={() => navigate('/achievements')} className="w-full sm:w-auto">
            🎨 查看成果墙
          </Button>
          <Button
            variant="orange"
            onClick={() => navigate('/achievements/submit')}
            className="w-full sm:w-auto"
          >
            ✍️ 提交成果
          </Button>
        </div>
      </div>
    </div>
  );
};