import { cn } from '@/features/shared/lib';
import type { HTMLAttributes } from 'react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = ({ className, emoji, size = 'md', ...props }: AvatarProps) => {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center',
        {
          'w-8 h-8 text-base': size === 'sm',
          'w-9 h-9 text-lg': size === 'md',
          'w-16 h-16 text-3xl': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {emoji}
    </div>
  );
};
