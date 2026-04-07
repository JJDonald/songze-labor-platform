import { Container } from '@/features/shared/components/layout';

interface WallHeaderProps {
  onFilterChange: (taskGroupId?: string) => void;
  activeFilter?: string;
}

const taskGroups = [
  { id: 'all', name: '全部', icon: '🎨' },
  { id: 'tidy', name: '整理与收纳', icon: '🧳' },
  { id: 'craft', name: '传统工艺制作', icon: '✂️' },
  { id: 'farm', name: '农业生产劳动', icon: '🌱' },
  { id: 'cook', name: '烹饪与营养', icon: '🍳' },
  { id: 'industry', name: '工业生产劳动', icon: '🔩' },
  { id: 'appliance', name: '家用器具', icon: '🔌' },
];

export const WallHeader = ({ onFilterChange, activeFilter }: WallHeaderProps) => {
  return (
    <div className="bg-gradient-to-br from-brand-orange to-brand-orange-light py-10 px-6">
      <Container>
        <h1 className="font-display text-4xl text-white mb-2">🎨 成果展示墙</h1>
        <p className="text-white/80 text-base mb-5">
          同学们的劳动成果都在这里，快来为大家点赞吧！
        </p>

        <div className="flex gap-2 flex-wrap">
          {taskGroups.map((tg) => (
            <button
              key={tg.id}
              onClick={() => onFilterChange(tg.id === 'all' ? undefined : tg.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                (activeFilter === tg.id || (tg.id === 'all' && !activeFilter))
                  ? 'bg-white text-brand-orange border-white'
                  : 'bg-white/15 text-white/85 border-white/40 border-2 hover:bg-white hover:text-brand-orange'
              }`}
            >
              {tg.icon} {tg.name}
            </button>
          ))}
        </div>
      </Container>
    </div>
  );
};