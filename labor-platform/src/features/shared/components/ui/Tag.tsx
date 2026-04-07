import { cn } from '@/features/shared/lib';
import type { HTMLAttributes } from 'react';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'green' | 'orange' | 'yellow';
}

export const Tag = ({ className, variant = 'green', children, ...props }: TagProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold',
        {
          'bg-brand-green-pale text-brand-green': variant === 'green',
          'bg-brand-orange-pale text-brand-orange': variant === 'orange',
          'bg-brand-yellow-pale text-[#B07D00]': variant === 'yellow',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
