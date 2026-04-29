import { cn } from '@/features/shared/lib';
import type { HTMLAttributes } from 'react';

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export const Container = ({ className, children, ...props }: ContainerProps) => {
  return (
    <div
      className={cn('max-w-[1100px] mx-auto px-6', className)}
      {...props}
    >
      {children}
    </div>
  );
};
