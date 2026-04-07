import { cn } from '@/features/shared/lib';

interface LoadingProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const Loading = ({ size = 'md', className }: LoadingProps) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'border-2 border-brand-sand border-t-brand-green rounded-full animate-spin',
          size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'
        )}
      />
    </div>
  );
};