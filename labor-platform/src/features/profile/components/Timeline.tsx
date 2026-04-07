import { formatDate } from '@/features/shared/lib';
import { Stars } from '@/features/shared/components/ui';
import type { Achievement } from '@/features/achievements/types';

interface TimelineProps {
  achievements: Achievement[];
  onEdit?: (achievement: Achievement) => void;
}

const API_BASE = 'http://localhost:3001';

export const Timeline = ({ achievements, onEdit }: TimelineProps) => {
  const hasRealImage = (images: string[]) => {
    return images.length > 0 && images[0].startsWith('/uploads');
  };

  return (
    <div className="flex flex-col gap-4">
      {achievements.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-brand-green-light mt-1" />
            {index < achievements.length - 1 && (
              <div className="w-0.5 flex-1 bg-brand-sand mt-1" />
            )}
          </div>

          <div 
            className="flex-1 bg-white rounded-xl p-4.5 shadow-sm hover:shadow hover:translate-x-1 transition-all cursor-pointer mb-1"
            onClick={() => onEdit?.(item)}
          >
            <div className="text-xs text-text-muted mb-1.5">
              {formatDate(item.createdAt)}
            </div>
            
            {item.images.length > 0 && hasRealImage(item.images) && (
              <div className="mb-3">
                <div className="grid grid-cols-3 gap-2">
                  {item.images.slice(0, 3).map((img, idx) => (
                    <img
                      key={idx}
                      src={`${API_BASE}${img}`}
                      alt={`照片 ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-lg bg-brand-sand"
                    />
                  ))}
                </div>
                {item.images.length > 3 && (
                  <div className="text-xs text-text-muted mt-1">+{item.images.length - 3} 张照片</div>
                )}
              </div>
            )}
            
            <div className="flex items-start gap-3">
              {!hasRealImage(item.images) && (
                <div className="text-2xl">
                  {item.images[0] || '📝'}
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-sm font-bold mb-1">{item.title}</h4>
                <p className="text-xs text-text-soft leading-relaxed mb-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stars value={item.evalAttitude} size="sm" />
                    <span className="text-xs text-text-muted">❤️ {item.likesCount}</span>
                  </div>
                  {onEdit && (
                    <span className="text-xs text-brand-green font-semibold">编辑 ✏️</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};