import { cn } from '@/features/shared/lib';

interface EmptyStateProps {
  message: string;
  icon?: string;
  className?: string;
}

export const EmptyState = ({ message, icon = '📭', className }: EmptyStateProps) => {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-text-muted text-sm">{message}</p>
    </div>
  );
};