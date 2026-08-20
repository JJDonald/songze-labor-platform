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
    <div className="bg-gradient-to-br from-brand-orange to-brand-orange-light px-4 py-8 sm:px-6 sm:py-10">
      <Container>
        <h1 className="mb-2 font-display text-3xl text-white sm:text-4xl">🎨 成果展示墙</h1>
        <p className="mb-4 text-sm text-white/80 sm:mb-5 sm:text-base">
          同学们的劳动成果都在这里，快来为大家点赞吧！
        </p>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          {taskGroups.map((tg) => (
            <button
              key={tg.id}
              onClick={() => onFilterChange(tg.id === 'all' ? undefined : tg.id)}
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition-all sm:px-4 ${
                (activeFilter === tg.id || (tg.id === 'all' && !activeFilter))
                  ? 'border-white bg-white text-brand-orange'
                  : 'border-2 border-white/40 bg-white/15 text-white/85 hover:bg-white hover:text-brand-orange'
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