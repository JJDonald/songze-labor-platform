import type { ReviewStatus } from '../types';
import { cn } from '@/features/shared/lib';

const statusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  PENDING: { label: '待审核', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: '审核通过', className: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED: { label: '审核驳回', className: 'bg-red-50 text-red-700 border-red-200' },
};

interface ReviewStatusTagProps {
  status: ReviewStatus;
  className?: string;
}

export const ReviewStatusTag = ({ status, className }: ReviewStatusTagProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
