import { cn } from '@/features/shared/lib';

interface StarsProps {
  value: number; // 1-5
  size?: 'sm' | 'md';
  className?: string;
}

export const Stars = ({ value, size = 'sm', className }: StarsProps) => {
  return (
    <div className={cn('flex gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            size === 'sm' ? 'text-sm' : 'text-base',
            i <= value ? 'text-brand-yellow' : 'text-gray-300'
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
};