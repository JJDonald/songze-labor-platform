import { cn } from '@/features/shared/lib';
import type { HTMLAttributes } from 'react';

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export const Container = ({ className, children, ...props }: ContainerProps) => {
  return (
    <div
      className={cn('mx-auto w-full max-w-[1100px] px-4 sm:px-6', className)}
      {...props}
    >
      {children}
    </div>
  );
};
